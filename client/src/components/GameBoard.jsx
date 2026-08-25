import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';
import ColorPickerModal from './ColorPickerModal';
import GameOverModal from './GameOverModal';
import { soundManager } from '../utils/audio';
import {
  Flame,
  AlertTriangle,
  RotateCw,
  RotateCcw,
  ScrollText,
  Maximize,
  Minimize,
  Clock,
  Volume2,
  VolumeX,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Zap,
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
  unoToast,
}) {
  const [selectedWildCardIndex, setSelectedWildCardIndex] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.muted);
  const [timeLeft, setTimeLeft] = useState(20);
  const [localUnoError, setLocalUnoError] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);

  const prevTurnIndexRef = useRef(null);
  const prevDiscardRef = useRef(null);
  const prevHandCountRef = useRef(0);

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
    pendingDrawCount = 0,
  } = gameState;

  // Toggle Sound Mute
  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

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

  // Trigger sound when UNO toast is broadcasted
  useEffect(() => {
    if (unoToast) {
      soundManager.unoSound();
    }
  }, [unoToast]);

  // Play sound on card played / turn change
  useEffect(() => {
    if (topDiscard && prevDiscardRef.current && (prevDiscardRef.current.id !== topDiscard.id || prevDiscardRef.current.value !== topDiscard.value || prevDiscardRef.current.color !== topDiscard.color)) {
      soundManager.playCardSound();
    }
    prevDiscardRef.current = topDiscard;
  }, [topDiscard]);

  // Play sound on winner
  useEffect(() => {
    if (gameState.gameState === 'FINISHED' && winner) {
      soundManager.winSound();
    }
  }, [gameState.gameState, winner]);

  // 20-Second Turn Countdown Timer & Tick Sound
  useEffect(() => {
    if (!turnDeadline) {
      setTimeLeft(20);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 5 && remaining > 0 && isMyTurn) {
        soundManager.tickSound();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [turnDeadline, currentTurnIndex, isMyTurn]);

  // Clear local UNO error after 3 seconds
  useEffect(() => {
    if (localUnoError) {
      const timer = setTimeout(() => setLocalUnoError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [localUnoError]);

  // Locate current player and relative opponents
  const myIndex = players.findIndex((p) => p.id === myId);
  const me = players[myIndex] || { name: 'Player', hand: [], cardCount: 0, calledUno: false };

  // Track hand count changes for draw animation
  useEffect(() => {
    if (me.hand.length > prevHandCountRef.current && prevHandCountRef.current > 0) {
      setIsDrawing(true);
      const timer = setTimeout(() => setIsDrawing(false), 500);
      return () => clearTimeout(timer);
    }
    prevHandCountRef.current = me.hand.length;
  }, [me.hand.length]);

  // Organize opponents clockwise starting from my position
  const otherPlayers = [];
  if (myIndex !== -1 && players.length > 1) {
    for (let i = 1; i < players.length; i++) {
      const oppIdx = (myIndex + i) % players.length;
      otherPlayers.push(players[oppIdx]);
    }
  }

  // Check if a specific card in hand is a legal play (enforces +4 strictly countered by +4 only)
  const isCardPlayable = (card) => {
    if (!isMyTurn || !card) return false;

    // If there is an active stacked draw penalty (+2 or +4):
    if (pendingDrawCount > 0) {
      if (topDiscard && topDiscard.type === 'wild4') {
        // +4 card can ONLY be countered with another +4 card!
        return card.type === 'wild4';
      }
      if (topDiscard && topDiscard.type === 'draw2') {
        // +2 card can be countered with +2 or +4!
        return card.type === 'draw2' || card.type === 'wild4';
      }
      return card.type === 'draw2' || card.type === 'wild4';
    }

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

    soundManager.playCardSound();

    if (card.color === 'wild') {
      setSelectedWildCardIndex(cardIndex);
    } else {
      onPlayCard(cardIndex, null);
    }
  };

  const handleWildColorChoice = (color) => {
    if (selectedWildCardIndex !== null) {
      soundManager.playCardSound();
      onPlayCard(selectedWildCardIndex, color);
      setSelectedWildCardIndex(null);
    }
  };

  const handleDrawCardClick = () => {
    if (!isMyTurn) return;
    soundManager.drawCardSound();
    setIsDrawing(true);
    onDrawCard();
    setTimeout(() => setIsDrawing(false), 500);
  };

  const handleCallUnoClick = () => {
    if (me.hand.length > 2) {
      soundManager.penaltySound();
      setLocalUnoError('You can only shout UNO when you have 1 or 2 cards!');
      return;
    }
    soundManager.unoSound();
    onCallUno();
  };

  // Border color map for center color badge
  const colorBadgeClasses = {
    red: 'bg-[#E53935] text-white shadow-red-500/50',
    blue: 'bg-[#1E88E5] text-white shadow-blue-500/50',
    green: 'bg-[#43A047] text-white shadow-emerald-500/50',
    yellow: 'bg-[#FBC02D] text-slate-950 shadow-yellow-400/50',
  }[currentColor] || 'bg-slate-700 text-white';

  const activeError = error || localUnoError;

  return (
    <div className="relative min-h-screen w-full bg-slate-950 flex flex-col justify-between overflow-hidden select-none">
      {/* Background Subtle Table Surface Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none"></div>

      {/* Top Header Bar */}
      <header className="relative z-20 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="font-title font-black text-xl sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-green-400 animate-float-slow">
            UNO!
          </span>
          <div className="px-2 py-0.5 sm:px-3 sm:py-1 bg-slate-800 border border-slate-700 rounded-lg text-[10px] sm:text-xs font-mono font-bold text-yellow-400">
            ROOM: {code}
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sound Mute Toggle */}
          <button
            onClick={handleToggleMute}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-all"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-all"
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
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-all"
          >
            <ScrollText className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">{showLogs ? 'Hide Logs' : 'Action Logs'}</span>
          </button>
        </div>
      </header>

      {/* Action Logs Drawer Modal */}
      {showLogs && (
        <div className="fixed top-14 sm:top-16 right-2 sm:right-4 z-40 w-72 sm:w-80 max-h-72 sm:max-h-80 bg-slate-900/95 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-lg flex flex-col">
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
      {activeError && (
        <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 sm:px-6 sm:py-2 bg-red-500/90 text-white font-bold text-xs sm:text-sm rounded-full shadow-lg border border-red-400 animate-bounce text-center max-w-[90vw]">
          ⚠️ {activeError}
        </div>
      )}

      {/* Center Table Area */}
      <main className="relative flex-1 flex flex-col items-center justify-between p-2 sm:p-4 max-w-6xl w-full mx-auto">
        {/* Opponents Section */}
        <div className="w-full flex flex-wrap justify-center items-center gap-2 sm:gap-4 pt-1 sm:pt-2 mb-2 sm:mb-4 max-h-40 sm:max-h-none overflow-y-auto">
          {otherPlayers.map((opp) => (
            <div
              key={opp.id}
              className={`relative flex flex-col items-center p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-300 ${
                opp.isCurrentTurn
                  ? 'bg-slate-900/90 border-2 border-yellow-400 shadow-xl shadow-yellow-500/20 scale-105'
                  : 'bg-slate-900/40 border border-slate-800'
              }`}
            >
              {/* SMALL TOAST BADGE DIRECTLY ON THE SIDE OF OPPONENT WHO CALLED UNO */}
              {unoToast && unoToast.playerId === opp.id && (
                <div className="absolute -top-3 -right-2 z-30 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 text-white font-black text-[10px] sm:text-xs rounded-full shadow-xl border border-yellow-300 animate-bounce flex items-center gap-1 backdrop-blur-md">
                  <Flame className="w-3 h-3 text-yellow-300 fill-current animate-pulse" />
                  <span>📢 UNO!</span>
                </div>
              )}

              {/* Avatar & Info */}
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs sm:text-sm text-white">
                  {opp.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-[11px] sm:text-xs font-bold text-white leading-tight max-w-[80px] sm:max-w-none truncate">{opp.name}</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 font-semibold">{opp.cardCount} Cards</div>
                </div>
              </div>

              {/* Card Back Fan Preview */}
              <div className="flex -space-x-3 sm:-space-x-4">
                {Array.from({ length: Math.min(opp.cardCount, 5) }).map((_, idx) => (
                  <Card key={idx} isFaceDown size="small" />
                ))}
              </div>

              {/* TIMER DIRECTLY UNDER OPPONENT IF IT IS THEIR TURN */}
              {opp.isCurrentTurn && (
                <div className={`mt-1.5 sm:mt-2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1 shadow-lg border ${
                  timeLeft <= 5
                    ? 'bg-red-600 border-red-400 text-white animate-pulse shadow-red-600/50 scale-105'
                    : 'bg-yellow-400 border-yellow-300 text-slate-950 shadow-yellow-400/30'
                }`}>
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>⏳ 0:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
                </div>
              )}

              {/* Catch UNO button or Called UNO Badge */}
              {opp.cardCount === 1 && !opp.calledUno && (
                <button
                  onClick={() => {
                    soundManager.unoSound();
                    onCatchUno(opp.id);
                  }}
                  className="mt-1.5 sm:mt-2 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-[9px] sm:text-[10px] uppercase rounded-full shadow-lg border border-red-400 animate-pulse cursor-pointer"
                >
                  🚨 Catch UNO!
                </button>
              )}

              {opp.cardCount === 1 && opp.calledUno && (
                <div className="mt-1.5 sm:mt-2 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-emerald-500 text-slate-950 font-black text-[9px] sm:text-[10px] uppercase rounded-full shadow border border-emerald-300 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-yellow-300 fill-current" />
                  <span>🔥 CALLED UNO!</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Center Table: Discard Pile, Draw Deck & Clean Compact Pill */}
        <div className="relative my-auto flex flex-col items-center gap-2 sm:gap-4 w-full">
          {/* STACKED DRAW PENALTY WARNING BANNER */}
          {pendingDrawCount > 0 && (
            <div className="px-3 py-1 sm:px-5 sm:py-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-full shadow-lg border border-yellow-300 animate-pulse flex items-center gap-1.5 text-center max-w-[95vw]">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300 fill-current flex-shrink-0" />
              <span>
                ⚡ PENALTY: +{pendingDrawCount} CARDS! {topDiscard?.type === 'wild4' ? 'Counter with +4 ONLY or Draw' : 'Counter with +2 / +4 or Draw'}
              </span>
            </div>
          )}

          {/* SLEEK COLOR & PROMINENT DIRECTION PILL */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 bg-slate-900/95 border border-slate-800 px-3 sm:px-6 py-2 sm:py-2.5 rounded-full shadow-2xl backdrop-blur-md max-w-full">
            {/* Color Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">COLOR:</span>
              <span className={`px-3 py-0.5 sm:px-4 sm:py-1 rounded-full font-black text-[10px] sm:text-xs uppercase shadow-md ${colorBadgeClasses}`}>
                {currentColor || 'ANY'}
              </span>
            </div>

            <div className="hidden xs:block h-4 sm:h-5 w-px bg-slate-700"></div>

            {/* LARGER PROMINENT DIRECTION BADGE */}
            <div className={`px-3 py-0.5 sm:px-4 sm:py-1 rounded-full font-black text-[10px] sm:text-sm uppercase tracking-wider flex items-center gap-1.5 sm:gap-2.5 shadow-lg border ${
              direction === 1
                ? 'bg-emerald-500 border-emerald-300 text-slate-950 shadow-emerald-500/30'
                : 'bg-amber-400 border-amber-200 text-slate-950 shadow-amber-400/30'
            }`}>
              {direction === 1 ? (
                <>
                  <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-slate-950 flex items-center justify-center text-emerald-400 shadow-inner">
                    <RotateCw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin-slow stroke-[3]" />
                  </div>
                  <span className="tracking-wide">CLOCKWISE</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3] animate-pulse" />
                </>
              ) : (
                <>
                  <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-slate-950 flex items-center justify-center text-amber-400 shadow-inner">
                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin-reverse-slow stroke-[3]" />
                  </div>
                  <span className="tracking-wide">ANTI-CLOCKWISE</span>
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3] animate-pulse" />
                </>
              )}
            </div>
          </div>

          {/* Cards Table Surface */}
          <div className="flex items-center justify-center gap-4 sm:gap-10 p-3 sm:p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl sm:rounded-3xl backdrop-blur-sm shadow-2xl">
            {/* Draw Deck with Lift Animation */}
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {pendingDrawCount > 0 ? `Draw (+${pendingDrawCount})` : 'Draw Deck'}
              </span>
              <div className={`relative transition-transform ${isDrawing ? 'animate-draw-card-lift' : ''}`}>
                <Card isFaceDown size="large" />
                <button
                  onClick={handleDrawCardClick}
                  disabled={!isMyTurn}
                  className={`absolute inset-0 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center font-black text-[10px] sm:text-xs text-white uppercase tracking-wider transition-all bg-black/30 backdrop-blur-[2px] ${
                    isMyTurn ? 'hover:bg-red-600/30 cursor-pointer border-2 border-yellow-400' : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  <span className="bg-slate-950/80 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-700 shadow text-center">
                    {pendingDrawCount > 0 ? `TAKE +${pendingDrawCount}` : 'DRAW CARD'}
                  </span>
                </button>
              </div>
            </div>

            {/* Discard Pile with Realistic Card Play Animation */}
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Discard Pile</span>
              <div
                key={topDiscard ? `${topDiscard.color}-${topDiscard.value}-${topDiscard.type}-${logs?.length}` : 'empty-discard'}
                className="relative animate-play-card"
              >
                {topDiscard ? (
                  <Card card={topDiscard} size="large" disabled />
                ) : (
                  <div className="w-20 h-30 xs:w-24 xs:h-36 sm:w-28 sm:h-44 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs font-bold">
                    Empty
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Player Bottom Bar & Hand */}
        <div className="w-full flex flex-col items-center gap-2 sm:gap-3 pb-1 sm:pb-2 z-20">
          {/* Active Turn Banner & TIMER DIRECTLY UNDER/ABOVE ACTIVE PLAYER */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isMyTurn ? (
              <div className={`px-4 py-1.5 sm:px-6 sm:py-2 rounded-full font-black text-xs sm:text-sm text-white shadow-xl flex items-center gap-1.5 sm:gap-2 transition-all ${
                timeLeft <= 5
                  ? 'bg-red-600 border border-red-400 animate-pulse shadow-red-600/50 scale-105'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-400 shadow-emerald-950/50'
              }`}>
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300" />
                <span>✨ YOUR TURN: 0:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}s ✨</span>
              </div>
            ) : (
              <div className="px-3 py-1 sm:px-5 sm:py-1.5 bg-slate-900 border border-slate-800 text-slate-400 font-semibold text-[10px] sm:text-xs rounded-full flex items-center gap-1.5 sm:gap-2">
                <span>Waiting for {players[currentTurnIndex]?.name || 'opponent'}'s move...</span>
              </div>
            )}
          </div>

          {/* Action Bar: Call UNO Button & Local Player Toast Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            {me.calledUno ? (
              <div className="px-5 py-2 sm:px-8 sm:py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white font-black text-sm sm:text-lg tracking-wider rounded-xl sm:rounded-2xl shadow-xl shadow-emerald-950/60 border border-emerald-300 flex items-center gap-1.5 sm:gap-2 animate-pulse">
                <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-300" />
                <span>UNO CALLED!</span>
              </div>
            ) : (
              <button
                onClick={handleCallUnoClick}
                className={`px-5 py-2.5 sm:px-8 sm:py-3 bg-gradient-to-r from-red-600 via-rose-600 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-white font-black text-sm sm:text-lg tracking-wider rounded-xl sm:rounded-2xl shadow-xl shadow-red-950/60 border border-yellow-300 flex items-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 cursor-pointer ${
                  me.hand.length <= 2 ? 'opacity-100' : 'opacity-70'
                }`}
              >
                <Flame className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-300 fill-current" />
                <span>SHOUT UNO!</span>
              </button>
            )}

            {/* SMALL TOAST BADGE BESIDE LOCAL PLAYER WHEN THEY SHOUT UNO */}
            {unoToast && unoToast.playerId === myId && (
              <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 text-white font-black text-[10px] sm:text-xs rounded-full shadow-lg border border-yellow-300 animate-bounce flex items-center gap-1 sm:gap-1.5">
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300 fill-current animate-pulse" />
                <span>📢 SHOUTED UNO!</span>
              </div>
            )}
          </div>

          {/* Player Hand Cards Grid / Scrollable Row with Raised Playable Cards & Slide In */}
          <div className="w-full max-w-5xl px-2 sm:px-4 flex justify-center items-end -space-x-5 xs:-space-x-4 sm:-space-x-6 overflow-x-auto pb-2 sm:pb-4 pt-4 sm:pt-6 touch-pan-x scrollbar-none">
            {me.hand.map((card, idx) => {
              const playable = isCardPlayable(card);
              return (
                <div key={card.id || idx} className={`transform transition-transform ${isDrawing && idx === me.hand.length - 1 ? 'animate-card-slide-in' : ''}`}>
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
