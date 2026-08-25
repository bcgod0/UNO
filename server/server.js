import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  createDeck,
  shuffleDeck,
  drawCards,
  isValidMove,
  advanceTurn,
  sanitizeRoomForPlayer,
} from './gameEngine.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for dev flexibility
    methods: ['GET', 'POST'],
  },
});

// Store active rooms in memory
// Map<roomCode, RoomObject>
const rooms = new Map();

/**
 * Helper to generate a unique 5-character alphanumeric room code
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

/**
 * Broadcast updated room state to all clients in a specific room
 */
function broadcastRoomState(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const clientsInRoom = io.sockets.adapter.rooms.get(roomCode);
  if (!clientsInRoom) return;

  for (const socketId of clientsInRoom) {
    const sanitizedState = sanitizeRoomForPlayer(room, socketId);
    io.to(socketId).emit('game-state-updated', sanitizedState);
  }
}

/**
 * Helper to append action logs to room
 */
function addLog(room, message) {
  if (!room.logs) room.logs = [];
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  room.logs.push(`[${timestamp}] ${message}`);
  if (room.logs.length > 20) room.logs.shift();
}

/**
 * Clear existing turn timer for room
 */
function clearTurnTimer(room) {
  if (room && room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
}

/**
 * Reset 20-second turn timer for active room
 */
function resetTurnTimer(room) {
  clearTurnTimer(room);
  if (!room || room.gameState !== 'PLAYING') return;

  room.turnDeadline = Date.now() + 20000;

  room.turnTimer = setTimeout(() => {
    handleTurnTimeout(room);
  }, 20000);
}

/**
 * Handle 20-second turn expiration: penalize current player 1 card & advance turn
 */
function handleTurnTimeout(room) {
  if (!room || room.gameState !== 'PLAYING') return;

  const currentPlayer = room.players[room.currentTurn];
  if (currentPlayer) {
    const penaltyCard = drawCards(room.deck, room.discardPile, 1);
    if (penaltyCard.length > 0) {
      currentPlayer.hand.push(...penaltyCard);
    }
    addLog(room, `⏰ Time's up! ${currentPlayer.name} was penalized 1 card for taking too long.`);
  }

  advanceTurn(room, 1);
  resetTurnTimer(room);
  broadcastRoomState(room.code);
}

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // 1. CREATE ROOM
  socket.on('create-room', ({ username, maxPlayers }) => {
    if (!username || !username.trim()) {
      return socket.emit('error-msg', 'Username is required.');
    }

    const roomMaxPlayers = Math.min(Math.max(parseInt(maxPlayers) || 4, 2), 15);
    const roomCode = generateRoomCode();
    const player = {
      id: socket.id,
      name: username.trim(),
      hand: [],
      isHost: true,
      calledUno: false,
    };

    const newRoom = {
      code: roomCode,
      maxPlayers: roomMaxPlayers,
      hostId: socket.id,
      gameState: 'LOBBY', // LOBBY, PLAYING, FINISHED
      players: [player],
      deck: [],
      discardPile: [],
      currentTurn: 0,
      direction: 1, // 1: clockwise, -1: counter-clockwise
      currentColor: null,
      winner: null,
      logs: [],
      turnTimer: null,
      turnDeadline: null,
    };

    rooms.set(roomCode, newRoom);
    socket.join(roomCode);
    socket.roomCode = roomCode;

    addLog(newRoom, `${player.name} created room ${roomCode} (Max ${roomMaxPlayers} players)`);
    console.log(`Room created: ${roomCode} by ${username} (Max ${roomMaxPlayers} players)`);

    socket.emit('room-created', { roomCode });
    broadcastRoomState(roomCode);
  });

  // 2. JOIN ROOM
  socket.on('join-room', ({ username, roomCode }) => {
    if (!username || !username.trim()) {
      return socket.emit('error-msg', 'Username is required.');
    }
    if (!roomCode) {
      return socket.emit('error-msg', 'Room code is required.');
    }

    const upperCode = roomCode.trim().toUpperCase();
    const room = rooms.get(upperCode);

    if (!room) {
      return socket.emit('error-msg', `Room ${upperCode} does not exist.`);
    }

    if (room.gameState !== 'LOBBY') {
      return socket.emit('error-msg', 'Game has already started in this room.');
    }

    const maxCapacity = room.maxPlayers || 4;
    if (room.players.length >= maxCapacity) {
      return socket.emit('error-msg', `Room is full (Maximum ${maxCapacity} players allowed).`);
    }

    // Check if player already in room
    const existingPlayer = room.players.find((p) => p.id === socket.id);
    if (!existingPlayer) {
      const newPlayer = {
        id: socket.id,
        name: username.trim(),
        hand: [],
        isHost: false,
        calledUno: false,
      };
      room.players.push(newPlayer);
    }

    socket.join(upperCode);
    socket.roomCode = upperCode;

    addLog(room, `${username.trim()} joined the room.`);
    console.log(`${username} joined room ${upperCode}`);

    socket.emit('room-joined', { roomCode: upperCode });
    broadcastRoomState(upperCode);
  });

  // 3. START GAME (Host only)
  socket.on('start-game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return socket.emit('error-msg', 'Room not found.');
    if (room.hostId !== socket.id) return socket.emit('error-msg', 'Only the host can start the game.');
    if (room.players.length < 2) return socket.emit('error-msg', 'At least 2 players are required to start.');

    // Initialize Deck
    const deck = shuffleDeck(createDeck());
    const discardPile = [];

    // Deal 7 cards to each player
    room.players.forEach((player) => {
      player.hand = deck.splice(0, 7);
      player.calledUno = false;
    });

    // Draw initial discard card (must be a number card)
    let initialCardIndex = deck.findIndex((card) => card.type === 'number');
    if (initialCardIndex === -1) initialCardIndex = 0;

    const initialCard = deck.splice(initialCardIndex, 1)[0];
    discardPile.push(initialCard);

    room.deck = deck;
    room.discardPile = discardPile;
    room.currentColor = initialCard.color;
    room.currentTurn = 0;
    room.direction = 1;
    room.gameState = 'PLAYING';
    room.winner = null;

    addLog(room, `Game started! Top card is ${initialCard.color.toUpperCase()} ${initialCard.value}`);
    resetTurnTimer(room);
    broadcastRoomState(roomCode);
  });

  // 4. PLAY CARD
  socket.on('play-card', ({ roomCode, cardIndex, chosenColor }) => {
    const room = rooms.get(roomCode);
    if (!room || room.gameState !== 'PLAYING') return;

    const currentPlayer = room.players[room.currentTurn];
    if (currentPlayer.id !== socket.id) {
      return socket.emit('error-msg', "It's not your turn!");
    }

    if (cardIndex < 0 || cardIndex >= currentPlayer.hand.length) {
      return socket.emit('error-msg', 'Invalid card selection.');
    }

    const card = currentPlayer.hand[cardIndex];
    const topDiscard = room.discardPile[room.discardPile.length - 1];

    if (!isValidMove(card, topDiscard, room.currentColor)) {
      return socket.emit('error-msg', 'Invalid card play! Card must match color, value, or be a Wild card.');
    }

    // Remove played card from player hand
    currentPlayer.hand.splice(cardIndex, 1);
    room.discardPile.push(card);

    addLog(room, `${currentPlayer.name} played ${card.color !== 'wild' ? card.color.toUpperCase() : ''} ${card.value}`);

    // Check WIN condition
    if (currentPlayer.hand.length === 0) {
      clearTurnTimer(room);
      room.gameState = 'FINISHED';
      room.winner = { id: currentPlayer.id, name: currentPlayer.name };
      addLog(room, `🎉 ${currentPlayer.name} WON THE GAME! 🎉`);
      broadcastRoomState(roomCode);
      return;
    }

    // UNO call check: if player has 1 card left and didn't call UNO beforehand
    if (currentPlayer.hand.length === 1 && !currentPlayer.calledUno) {
      addLog(room, `⚠️ ${currentPlayer.name} has 1 card remaining but did NOT call UNO!`);
    }

    // Apply special card effects
    let skipSteps = 1;

    if (card.type === 'number') {
      room.currentColor = card.color;
    } else if (card.type === 'skip') {
      room.currentColor = card.color;
      skipSteps = 2; // Skip next player
      const skippedPlayer = room.players[(room.currentTurn + room.direction + room.players.length) % room.players.length];
      addLog(room, `🚫 ${skippedPlayer.name}'s turn was skipped!`);
    } else if (card.type === 'reverse') {
      room.currentColor = card.color;
      if (room.players.length === 2) {
        skipSteps = 2; // In 2 player UNO, Reverse acts like Skip
        addLog(room, `🔄 Reverse played! Turn skips back.`);
      } else {
        room.direction *= -1;
        addLog(room, `🔄 Direction reversed!`);
      }
    } else if (card.type === 'draw2') {
      room.currentColor = card.color;
      const targetIdx = (room.currentTurn + room.direction + room.players.length) % room.players.length;
      const targetPlayer = room.players[targetIdx];
      const drawn = drawCards(room.deck, room.discardPile, 2);
      targetPlayer.hand.push(...drawn);
      skipSteps = 2; // Next player receives cards and misses turn
      addLog(room, `+2! ${targetPlayer.name} drew 2 cards and missed their turn.`);
    } else if (card.type === 'wild') {
      room.currentColor = chosenColor || 'red';
      addLog(room, `🌈 Wild played! Color changed to ${room.currentColor.toUpperCase()}`);
    } else if (card.type === 'wild4') {
      room.currentColor = chosenColor || 'red';
      const targetIdx = (room.currentTurn + room.direction + room.players.length) % room.players.length;
      const targetPlayer = room.players[targetIdx];
      const drawn = drawCards(room.deck, room.discardPile, 4);
      targetPlayer.hand.push(...drawn);
      skipSteps = 2; // Target draws 4 and misses turn
      addLog(room, `+4! ${targetPlayer.name} drew 4 cards and missed their turn. Color is ${room.currentColor.toUpperCase()}`);
    }

    // Advance turn
    advanceTurn(room, skipSteps);
    resetTurnTimer(room);
    broadcastRoomState(roomCode);
  });

  // 5. DRAW CARD
  socket.on('draw-card', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.gameState !== 'PLAYING') return;

    const currentPlayer = room.players[room.currentTurn];
    if (currentPlayer.id !== socket.id) {
      return socket.emit('error-msg', "It's not your turn!");
    }

    const drawn = drawCards(room.deck, room.discardPile, 1);
    if (drawn.length > 0) {
      currentPlayer.hand.push(...drawn);
      addLog(room, `${currentPlayer.name} drew a card.`);
    }

    // Advance turn after drawing
    advanceTurn(room, 1);
    resetTurnTimer(room);
    broadcastRoomState(roomCode);
  });

  // 6. CALL UNO
  socket.on('call-uno', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.gameState !== 'PLAYING') return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      player.calledUno = true;
      addLog(room, `📢 ${player.name} CALLED UNO!`);
      broadcastRoomState(roomCode);
    }
  });

  // 7. CATCH UNO (Penalty for someone who forgot to call UNO)
  socket.on('catch-uno', ({ roomCode, targetPlayerId }) => {
    const room = rooms.get(roomCode);
    if (!room || room.gameState !== 'PLAYING') return;

    const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
    const callerPlayer = room.players.find((p) => p.id === socket.id);

    if (targetPlayer && targetPlayer.hand.length === 1 && !targetPlayer.calledUno) {
      const penaltyCards = drawCards(room.deck, room.discardPile, 2);
      targetPlayer.hand.push(...penaltyCards);
      addLog(room, `🚨 ${callerPlayer.name} caught ${targetPlayer.name}! 2 penalty cards drawn.`);
      broadcastRoomState(roomCode);
    } else {
      socket.emit('error-msg', 'Player cannot be caught for UNO penalty right now.');
    }
  });

  // 8. PLAY AGAIN (Restart game back to lobby or fresh deal)
  socket.on('play-again', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) {
      return socket.emit('error-msg', 'Only host can restart the game.');
    }

    clearTurnTimer(room);
    room.gameState = 'LOBBY';
    room.winner = null;
    room.deck = [];
    room.discardPile = [];
    room.players.forEach((p) => {
      p.hand = [];
      p.calledUno = false;
    });

    addLog(room, `Game reset by host. Back in lobby!`);
    broadcastRoomState(roomCode);
  });

  // 9. DISCONNECT
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    const roomCode = socket.roomCode;
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    const playerIndex = room.players.findIndex((p) => p.id === socket.id);
    if (playerIndex !== -1) {
      const disconnectedPlayer = room.players[playerIndex];
      room.players.splice(playerIndex, 1);
      addLog(room, `${disconnectedPlayer.name} left the room.`);

      // If room is empty, delete room
      if (room.players.length === 0) {
        clearTurnTimer(room);
        rooms.delete(roomCode);
        console.log(`Room ${roomCode} deleted (empty).`);
        return;
      }

      // If host left, transfer host privilege to next player
      if (room.hostId === socket.id) {
        room.hostId = room.players[0].id;
        room.players[0].isHost = true;
        addLog(room, `${room.players[0].name} is now the host.`);
      }

      // Adjust turn index if game was playing
      if (room.gameState === 'PLAYING') {
        if (room.players.length < 2) {
          clearTurnTimer(room);
          room.gameState = 'FINISHED';
          room.winner = room.players[0];
          addLog(room, `Game ended due to insufficient players. ${room.players[0].name} wins!`);
        } else if (room.currentTurn >= room.players.length) {
          room.currentTurn = 0;
          resetTurnTimer(room);
        } else {
          resetTurnTimer(room);
        }
      }

      broadcastRoomState(roomCode);
    }
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 UNO Server running on http://localhost:${PORT}`);
});
