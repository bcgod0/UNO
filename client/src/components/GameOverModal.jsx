import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home } from 'lucide-react';

export default function GameOverModal({ winner, isHost, onPlayAgain, onLeave }) {
  useEffect(() => {
    // Fire confetti cannons
    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in select-none">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-amber-500/10 text-center flex flex-col items-center relative overflow-hidden">
        {/* Glow Header */}
        <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-3xl flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/30 mb-6 animate-bounce-slow">
          <Trophy className="w-10 h-10" />
        </div>

        <h1 className="text-3xl font-black text-white mb-2">GAME OVER!</h1>
        <p className="text-slate-400 text-sm font-semibold mb-6">
          <span className="text-amber-400 font-extrabold text-xl">{winner?.name || 'A player'}</span> has cleared all their cards!
        </p>

        <div className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-6">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Winner
          </span>
          <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500">
            👑 {winner?.name}
          </span>
        </div>

        <div className="w-full flex flex-col sm:flex-row gap-3">
          {isHost ? (
            <button
              onClick={onPlayAgain}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-xl font-bold text-white shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 transition-all transform active:scale-95"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Play Again</span>
            </button>
          ) : (
            <div className="flex-1 py-3 text-slate-400 text-xs font-semibold">
              Waiting for host to restart game...
            </div>
          )}

          <button
            onClick={onLeave}
            className="py-4 px-6 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300 flex items-center justify-center gap-2 transition-all"
          >
            <Home className="w-5 h-5" />
            <span>Lobby</span>
          </button>
        </div>
      </div>
    </div>
  );
}
