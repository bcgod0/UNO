import React, { useState, useEffect } from 'react';
import Card from './Card';
import ColorPickerModal from './ColorPickerModal';
import GameOverModal from './GameOverModal';
import {
  Flame,
  AlertTriangle,
  RotateCw,
  RotateCcw,
  ScrollText,
  Maximize,
  Minimize,
  Clock,
  UserCheck,
  Award,
} from 'lucide-react';

export default function GameBoard({
  gameState,
  myId,
  onPlayCard,
  onDrawCard,
  onCallUno,
  onCatchUno,
  onPlayAgain,
  onLeaveRoom,
  error,
}) {
  const [selectedWildCardIndex, setSelectedWildCardIndex] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);

  const {
    code,
    players,
    topDiscard,
    currentColor,
    currentTurnIndex,
    currentTurnPlayerId,
    direction,
    deckCount,
    turnDeadline,
    winner,
    logs,
    isMyTurn,
  } = gameState;

  // Toggle Browser Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
      }
    }
  };

  // Sync Fullscreen state on escape key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 20-Second Turn Countdown Timer
  useEffect(() => {
    if (!turnDeadline) {
      setTimeLeft(20);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [turnDeadline, currentTurnIndex]);

  // Locate current player and relative opponents
  const myIndex = players.findIndex((p) => p.id === myId);
  const me = players[myIndex] || { name: 'Player', hand: [], cardCount: 0 };

  // Organize opponents clockwise starting from my position
  const otherPlayers = [];
  if (myIndex !== -1 && players.length > 1) {
    for (let i = 1; i < players.length; i++) {
      const oppIdx = (myIndex + i) % players.length;
      otherPlayers.push(players[oppIdx]);
    }
  }

  // Check if a specific card in hand is a legal play
  const isCardPlayable = (card) => {
    if (!isMyTurn || !card) return false;
    if (card.color === 'wild') return true;
    if (!topDiscard) return true;
    if (currentColor && card.color === currentColor) return true;
    if (topDiscard.value !== undefined && card.value !== undefined && card.value === topDiscard.value) return true;
    if (topDiscard.type !== undefined && card.type !== 'number' && card.type === topDiscard.type) return true;
    return false;
  };

  // Handle card click
  const handleCardClick = (cardIndex, playable) => {
    if (!isMyTurn || !playable) return;

    const card = me.hand[cardIndex];
    if (!card) return;

    if (card.color === 'wild') {
      setSelectedWildCardIndex(cardIndex);
    } else {
      onPlayCard(cardIndex, null);
    }
  };

  const handleWildColorChoice = (color) => {
    if (selectedWildCardIndex !== null) {
      onPlayCard(selectedWildCardIndex, color);
      setSelectedWildCardIndex(null);
    }
  };

  // Border color map for center color badge
  const colorBadgeClasses = {
    red: 'bg-red-500 text-white shadow-red-500/50',
    blue: 'bg-blue-500 text-white shadow-blue-500/50',
    green: 'bg-emerald-500 text-white shadow-emerald-500/50',
    yellow: 'bg-yellow-400 text-slate-950 shadow-yellow-400/50',
  }[currentColor] || 'bg-slate-700 text-white';

  return (
    <div className="relative min-h-screen w-full bg-slate-950 flex flex-col justify-between overflow-hidden select-none">
      {/* Background Subtle Table Surface Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none"></div>

      {/* Top Header Bar */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="font-title font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-green-400">
            UNO!
          </span>
          <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-yellow-400">
            ROOM: {code}
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2">
          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>

          {/* Action Logs Toggle */}
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-all"
          >
            <ScrollText className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">{showLogs ? 'Hide Logs' : 'Action Logs'}</span>
          </button>
        </div>
      </header>

      {/* Action Logs Drawer Modal */}
      {showLogs && (
        <div className="fixed top-16 right-4 z-40 w-80 max-h-80 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur-lg flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <ScrollText className="w-4 h-4 text-indigo-400" />
            <span>Match Event Feed</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-1.5 text-xs font-medium text-slate-300 pr-1">
            {logs && logs.length > 0 ? (
              logs.map((log, idx) => (
                <div key={idx} className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/60">
                  {log}
                </div>
              ))
            ) : (
              <span className="text-slate-500">No events yet.</span>
            )}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-6 py-2 bg-red-500/90 text-white font-bold text-sm rounded-full shadow-lg border border-red-400 animate-bounce">
          ⚠️ {error}
        </div>
      )}

      {/* Center Table Area */}
      <main className="relative flex-1 flex flex-col items-center justify-between p-4 max-w-6xl w-full mx-auto">
        {/* Opponents Section */}
        <div className="w-full flex justify-around items-center pt-2">
          {otherPlayers.map((opp) => (
            <div
              key={opp.id}
              className={`relative flex flex-col items-center p-3 rounded-2xl transition-all duration-300 ${
                opp.isCurrentTurn
                  ? 'bg-slate-900/90 border-2 border-yellow-400 shadow-xl shadow-yellow-500/20 scale-105'
                  : 'bg-slate-900/40 border border-slate-800'
              }`}
            >
              {/* Turn Indicator Highlight */}
              {opp.isCurrentTurn && (
                <div className="absolute -top-3 px-2 py-0.5 bg-yellow-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-full shadow flex items-center gap-1">
                  <Clock className="w-3 h-3 animate-spin-slow" />
                  <span>THINKING ({timeLeft}s)</span>
                </div>
              )}

              {/* Avatar & Info */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-white">
                  {opp.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white leading-tight">{opp.name}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">{opp.cardCount} Cards</div>
                </div>
              </div>

              {/* Card Back Fan Preview */}
              <div className="flex -space-x-4">
                {Array.from({ length: Math.min(opp.cardCount, 6) }).map((_, idx) => (
                  <Card key={idx} isFaceDown size="small" />
                ))}
              </div>

              {/* Catch UNO button if opponent has 1 card and forgot UNO */}
              {opp.cardCount === 1 && !opp.calledUno && (
                <button
                  onClick={() => onCatchUno(opp.id)}
                  className="mt-2 px-3 py-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-[10px] uppercase rounded-full shadow-lg border border-red-400 animate-pulse"
                >
                  🚨 Catch UNO!
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Center Table: Discard Pile, Draw Deck & 20s Turn Timer */}
        <div className="relative my-auto flex flex-col items-center">
          {/* Active Color, Direction & 20s Turn Timer */}
          <div className="mb-4 flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-6 py-2.5 rounded-full shadow-xl backdrop-blur-md">
            {/* Color Badge */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Color:</span>
              <span className={`px-3 py-1 rounded-full font-black text-xs uppercase shadow-md ${colorBadgeClasses}`}>
                {currentColor || 'ANY'}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-700"></div>

            {/* Turn Timer Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-xs transition-all ${
              timeLeft <= 5
                ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/50 scale-105'
                : 'bg-slate-800 text-yellow-400 border border-slate-700'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>0:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
            </div>

            <div className="h-4 w-px bg-slate-700"></div>

            {/* Direction */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              {direction === 1 ? (
                <RotateCw className="w-4 h-4 text-emerald-400 animate-spin-slow" />
              ) : (
                <RotateCcw className="w-4 h-4 text-emerald-400 animate-spin-slow" />
              )}
              <span className="hidden sm:inline">{direction === 1 ? 'Clockwise' : 'Counter-CCW'}</span>
            </div>
          </div>

          {/* Cards Table Surface */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 p-6 bg-slate-900/50 border border-slate-800/80 rounded-3xl backdrop-blur-sm shadow-2xl">
            {/* Draw Deck */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Draw Deck</span>
              <div className="relative">
                <Card isFaceDown size="large" />
                <button
                  onClick={onDrawCard}
                  disabled={!isMyTurn}
                  className={`absolute inset-0 rounded-2xl flex flex-col items-center justify-center font-black text-xs text-white uppercase tracking-wider transition-all bg-black/30 backdrop-blur-[2px] ${
                    isMyTurn ? 'hover:bg-red-600/30 cursor-pointer border-2 border-yellow-400' : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  <span className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-700 shadow">
                    DRAW CARD
                  </span>
                </button>
              </div>
            </div>

            {/* Discard Pile */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Discard Pile</span>
              <div className="relative">
                {topDiscard ? (
                  <Card card={topDiscard} size="large" disabled />
                ) : (
                  <div className="w-24 h-36 sm:w-28 sm:h-44 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs font-bold">
                    Empty
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Turn Alert Banner */}
          <div className="mt-4">
            {isMyTurn ? (
              <div className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-sm rounded-full shadow-lg shadow-emerald-950/50 animate-bounce flex items-center gap-2">
                <span>✨ YOUR TURN! ({timeLeft}s) ✨</span>
              </div>
            ) : (
              <div className="px-6 py-2 bg-slate-900 border border-slate-800 text-slate-400 font-semibold text-xs rounded-full flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-yellow-400" />
                <span>Waiting for {players[currentTurnIndex]?.name || 'opponent'} ({timeLeft}s left)...</span>
              </div>
            )}
          </div>
        </div>

        {/* Player Bottom Bar & Hand */}
        <div className="w-full flex flex-col items-center gap-3 pb-2 z-20">
          {/* Action Bar: Call UNO Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={onCallUno}
              className={`px-8 py-3 bg-gradient-to-r from-red-600 via-rose-600 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-white font-black text-lg tracking-wider rounded-2xl shadow-xl shadow-red-950/60 border border-yellow-300 flex items-center gap-2 transition-all transform active:scale-95 ${
                me.hand.length <= 2 ? 'animate-bounce' : 'opacity-80'
              }`}
            >
              <Flame className="w-6 h-6 text-yellow-300 fill-current" />
              <span>SHOUT UNO!</span>
            </button>
          </div>

          {/* Player Hand Cards Grid / Scrollable Row with Playable Highlighting */}
          <div className="w-full max-w-5xl px-4 flex justify-center items-end -space-x-4 sm:-space-x-6 overflow-x-auto pb-4 pt-6">
            {me.hand.map((card, idx) => {
              const playable = isCardPlayable(card);
              return (
                <div key={card.id || idx} className="transform transition-transform">
                  <Card
                    card={card}
                    onClick={() => handleCardClick(idx, playable)}
                    disabled={!isMyTurn || !playable}
                    isPlayable={isMyTurn && playable}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Wild Color Selection Modal */}
      {selectedWildCardIndex !== null && (
        <ColorPickerModal onSelectColor={handleWildColorChoice} />
      )}

      {/* Game Over Screen Modal */}
      {gameState.gameState === 'FINISHED' && (
        <GameOverModal
          winner={winner}
          isHost={gameState.hostId === myId}
          onPlayAgain={onPlayAgain}
          onLeave={onLeaveRoom}
        />
      )}
    </div>
  );
}
