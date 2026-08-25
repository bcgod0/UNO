import express from 'express';
import http from 'http';
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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow connections from Vite client
    methods: ['GET', 'POST'],
  },
});

// In-memory Room Storage
// roomCode -> { code, maxPlayers, hostId, gameState, players, deck, discardPile, currentColor, currentTurn, direction, turnDeadline, turnTimer, winner, logs, pendingDrawCount }
const rooms = new Map();

/**
 * Generate a unique 5-character alphanumeric Room Code
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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
 * Broadcast sanitized room state to each connected player in the room
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
 * Handle 20-second turn expiration: penalize current player & advance turn
 */
function handleTurnTimeout(room) {
  if (!room || room.gameState !== 'PLAYING') return;

  const currentPlayer = room.players[room.currentTurn];
  if (currentPlayer) {
    const drawAmount = room.pendingDrawCount > 0 ? room.pendingDrawCount : 1;
    const penaltyCards = drawCards(room.deck, room.discardPile, drawAmount);
    if (penaltyCards.length > 0) {
      currentPlayer.hand.push(...penaltyCards);
    }
    if (currentPlayer.hand.length > 1) {
      currentPlayer.calledUno = false;
    }
    if (room.pendingDrawCount > 0) {
      addLog(room, `⏰ Time's up! ${currentPlayer.name} was penalized ${drawAmount} stacked cards.`);
      room.pendingDrawCount = 0;
    } else {
      addLog(room, `⏰ Time's up! ${currentPlayer.name} was penalized 1 card for taking too long.`);
    }
  }

  advanceTurn(room, 1);
  resetTurnTimer(room);
  broadcastRoomState(room.code);
}

/**
 * Check and penalize players holding 1 card who failed to shout UNO before another turn move
 */
function checkAndPenalizeUncalledUno(room, actingPlayerId) {
  room.players.forEach((p) => {
    if (p.id !== actingPlayerId && p.hand.length === 1 && !p.calledUno) {
      const penaltyCards = drawCards(room.deck, room.discardPile, 2);
      p.hand.push(...penaltyCards);
      p.calledUno = false;
      addLog(room, `🚨 Penalty! ${p.name} failed to shout UNO before the next card was played and drew 2 penalty cards!`);
    }
  });
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
      currentColor: null,
      currentTurn: 0,
      direction: 1,
      turnDeadline: null,
      turnTimer: null,
      winner: null,
      logs: [],
      pendingDrawCount: 0,
    };

    rooms.set(roomCode, newRoom);
    socket.join(roomCode);
    socket.roomCode = roomCode;

    addLog(newRoom, `Room ${roomCode} created by ${username.trim()} (Max ${roomMaxPlayers} players).`);
    console.log(`Room created: ${roomCode} by ${username} (Max ${roomMaxPlayers} players)`);

    socket.emit('room-created', { roomCode, maxPlayers: roomMaxPlayers });
    broadcastRoomState(roomCode);
  });

  // 2. JOIN ROOM
  socket.on('join-room', ({ username, roomCode }) => {
    if (!username || !username.trim()) {
      return socket.emit('error-msg', 'Username is required.');
    }
    if (!roomCode || !roomCode.trim()) {
      return socket.emit('error-msg', 'Room code is required.');
    }

    const upperCode = roomCode.trim().toUpperCase();
    const room = rooms.get(upperCode);

    if (!room) {
      return socket.emit('error-msg', 'Room not found! Check your code.');
    }
    if (room.gameState !== 'LOBBY') {
      return socket.emit('error-msg', 'Game has already started in this room.');
    }
    const maxCapacity = room.maxPlayers || 4;
    if (room.players.length >= maxCapacity) {
      return socket.emit('error-msg', `Room is full! (Max ${maxCapacity} players allowed).`);
    }

    const existingPlayer = room.players.find((p) => p.name.toLowerCase() === username.trim().toLowerCase());
    if (existingPlayer) {
      return socket.emit('error-msg', 'Username is already taken in this room.');
    }

    const player = {
      id: socket.id,
      name: username.trim(),
      hand: [],
      isHost: false,
      calledUno: false,
    };

    room.players.push(player);
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
    room.pendingDrawCount = 0;

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

    // Check move validity with Stacking Rules
    if (!isValidMove(card, topDiscard, room.currentColor, room.pendingDrawCount || 0)) {
      if (room.pendingDrawCount > 0) {
        return socket.emit('error-msg', `Active stacked draw penalty (+${room.pendingDrawCount})! Counter with a +2 or +4 card, or click Draw Card to take the cards.`);
      }
      return socket.emit('error-msg', 'Invalid card play! Card must match color, value, or be a Wild card.');
    }

    // Rule: Penalize any other player holding 1 card who failed to shout UNO before this move!
    checkAndPenalizeUncalledUno(room, currentPlayer.id);

    // Remove played card from player hand
    currentPlayer.hand.splice(cardIndex, 1);
    room.discardPile.push(card);

    addLog(room, `${currentPlayer.name} played ${card.color !== 'wild' ? card.color.toUpperCase() : ''} ${card.value || card.type}`);

    // Check WIN condition
    if (currentPlayer.hand.length === 0) {
      clearTurnTimer(room);
      room.gameState = 'FINISHED';
      room.winner = { id: currentPlayer.id, name: currentPlayer.name };
      addLog(room, `🎉 ${currentPlayer.name} WON THE GAME! 🎉`);
      broadcastRoomState(roomCode);
      return;
    }

    // UNO check: if player reaches 1 card without calling UNO
    if (currentPlayer.hand.length === 1 && !currentPlayer.calledUno) {
      addLog(room, `⚠️ ${currentPlayer.name} has 1 card remaining! (Shout UNO before the next turn!)`);
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
      room.direction *= -1;
      if (room.players.length === 2) {
        skipSteps = 2; // In 2 player UNO, Reverse acts like Skip
        addLog(room, `🔄 Reverse played! Direction reversed & turn skipped.`);
      } else {
        addLog(room, `🔄 Direction reversed!`);
      }
    } else if (card.type === 'draw2') {
      room.currentColor = card.color;
      room.pendingDrawCount = (room.pendingDrawCount || 0) + 2;
      skipSteps = 1; // Move turn to next player so they can counter stack or draw!
      addLog(room, `⚡ +2 played! Stacked draw penalty is now +${room.pendingDrawCount} cards!`);
    } else if (card.type === 'wild') {
      room.currentColor = chosenColor || 'red';
      addLog(room, `🌈 Wild played! Color changed to ${room.currentColor.toUpperCase()}`);
    } else if (card.type === 'wild4') {
      room.currentColor = chosenColor || 'red';
      room.pendingDrawCount = (room.pendingDrawCount || 0) + 4;
      skipSteps = 1; // Move turn to next player so they can counter stack or draw!
      addLog(room, `⚡ +4 Wild played! Color changed to ${room.currentColor.toUpperCase()}. Stacked draw penalty is now +${room.pendingDrawCount} cards!`);
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

    // Rule: Penalize any other player holding 1 card who failed to shout UNO before this turn move!
    checkAndPenalizeUncalledUno(room, currentPlayer.id);

    const drawCount = room.pendingDrawCount > 0 ? room.pendingDrawCount : 1;
    const drawn = drawCards(room.deck, room.discardPile, drawCount);

    if (drawn.length > 0) {
      currentPlayer.hand.push(...drawn);
      if (currentPlayer.hand.length > 1) {
        currentPlayer.calledUno = false;
      }
      if (room.pendingDrawCount > 0) {
        addLog(room, `⚡ ${currentPlayer.name} could not counter and drew ${drawCount} stacked penalty cards!`);
        room.pendingDrawCount = 0;
      } else {
        addLog(room, `${currentPlayer.name} drew a card.`);
      }
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
    if (!player) return;

    if (player.hand.length > 2) {
      return socket.emit('error-msg', 'You can only shout UNO when you have 1 or 2 cards!');
    }

    player.calledUno = true;
    addLog(room, `📢 ${player.name} SHOUTED UNO! 🔥`);

    // Broadcast toast alert with playerId to all players in the room
    io.to(roomCode).emit('uno-shouted-toast', { playerId: player.id, playerName: player.name });
    broadcastRoomState(roomCode);
  });

  // 7. CATCH UNO (Penalty for someone who forgot to call UNO)
  socket.on('catch-uno', ({ roomCode, targetPlayerId }) => {
    const room = rooms.get(roomCode);
    if (!room || room.gameState !== 'PLAYING') return;

    const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
    const callerPlayer = room.players.find((p) => p.id === socket.id);

    if (!targetPlayer || !callerPlayer) return;

    if (targetPlayer.id === socket.id) {
      return socket.emit('error-msg', 'You cannot catch yourself!');
    }

    if (targetPlayer.hand.length === 1 && !targetPlayer.calledUno) {
      const penaltyCards = drawCards(room.deck, room.discardPile, 2);
      targetPlayer.hand.push(...penaltyCards);
      targetPlayer.calledUno = false;
      addLog(room, `🚨 ${callerPlayer.name} caught ${targetPlayer.name}! 2 penalty cards drawn.`);
      broadcastRoomState(roomCode);
    } else {
      socket.emit('error-msg', `${targetPlayer.name} cannot be caught for UNO penalty right now.`);
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
    room.pendingDrawCount = 0;
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
server.listen(PORT, () => {
  console.log(`🚀 UNO Server running on http://localhost:${PORT}`);
});
