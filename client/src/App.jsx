import React, { useState, useEffect } from 'react';
import { socket } from './utils/socket';
import Home from './components/Home';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

export default function App() {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [unoToast, setUnoToast] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    // Socket Event Listeners
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to socket server:', socket.id);
    });

    socket.on('room-created', ({ roomCode }) => {
      setRoomCode(roomCode);
      setError(null);
    });

    socket.on('room-joined', ({ roomCode }) => {
      setRoomCode(roomCode);
      setError(null);
    });

    socket.on('game-state-updated', (state) => {
      setGameState(state);
      setError(null);
    });

    socket.on('uno-shouted-toast', ({ playerId, playerName }) => {
      setUnoToast({ playerId, playerName });
      setTimeout(() => setUnoToast(null), 3500);
    });

    socket.on('error-msg', (msg) => {
      setError(msg);
      setTimeout(() => setError(null), 4000);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from socket server');
    });

    return () => {
      socket.off('connect');
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('game-state-updated');
      socket.off('uno-shouted-toast');
      socket.off('error-msg');
      socket.off('disconnect');
    };
  }, []);

  const handleCreateRoom = (name, maxPlayers) => {
    setUsername(name);
    if (!socket.connected) socket.connect();
    socket.emit('create-room', { username: name, maxPlayers });
  };

  const handleJoinRoom = (name, code) => {
    setUsername(name);
    if (!socket.connected) socket.connect();
    socket.emit('join-room', { username: name, roomCode: code });
  };

  const handleStartGame = (code) => {
    socket.emit('start-game', { roomCode: code });
  };

  const handlePlayCard = (cardIndex, chosenColor) => {
    socket.emit('play-card', { roomCode: gameState.code, cardIndex, chosenColor });
  };

  const handleDrawCard = () => {
    socket.emit('draw-card', { roomCode: gameState.code });
  };

  const handleCallUno = () => {
    socket.emit('call-uno', { roomCode: gameState.code });
  };

  const handleCatchUno = (targetPlayerId) => {
    socket.emit('catch-uno', { roomCode: gameState.code, targetPlayerId });
  };

  const handlePlayAgain = () => {
    socket.emit('play-again', { roomCode: gameState.code });
  };

  const handleLeaveRoom = () => {
    if (socket.connected) socket.disconnect();
    setGameState(null);
    setRoomCode('');
  };

  // Render view based on game state
  if (!gameState) {
    return <Home onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} error={error} isConnected={isConnected} />;
  }

  if (gameState.gameState === 'LOBBY') {
    return (
      <Lobby
        gameState={gameState}
        onStartGame={handleStartGame}
        onLeaveRoom={handleLeaveRoom}
        myId={socket.id}
        error={error}
      />
    );
  }

  return (
    <GameBoard
      gameState={gameState}
      myId={socket.id}
      onPlayCard={handlePlayCard}
      onDrawCard={handleDrawCard}
      onCallUno={handleCallUno}
      onCatchUno={handleCatchUno}
      onPlayAgain={handlePlayAgain}
      onLeaveRoom={handleLeaveRoom}
      error={error}
      unoToast={unoToast}
    />
  );
}
