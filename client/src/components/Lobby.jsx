import React, { useState } from 'react';
import { Crown, Copy, Check, Users, Play, ShieldAlert, User } from 'lucide-react';

export default function Lobby({ gameState, onStartGame, myId, error }) {
  const [copied, setCopied] = useState(false);

  const { code, players, hostId, maxPlayers = 4 } = gameState;
  const isHost = hostId === myId;
  const canStart = isHost && players.length >= 2 && players.length <= maxPlayers;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 select-none">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black">
        {/* Header with Room Code */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Game Room Lobby</span>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <span>Code:</span>
              <span className="font-mono text-3xl text-yellow-400 tracking-wider font-extrabold">{code}</span>
            </h1>
          </div>

          <button
            onClick={copyRoomCode}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700/60 rounded-xl text-xs font-bold text-slate-200 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
            <span>{copied ? 'Code Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="w-full mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-medium animate-pulse">
            ⚠️ {error}
          </div>
        )}

        {/* Players Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
            <Users className="w-4 h-4 text-red-500" />
            <span>Connected Players</span>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-800 rounded-full text-slate-400">
            {players.length} / {maxPlayers} Players
          </span>
        </div>

        {/* Player List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {players.map((p, idx) => {
            const isMe = p.id === myId;
            return (
              <div
                key={p.id || idx}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  isMe
                    ? 'bg-gradient-to-r from-red-950/40 to-slate-900 border-red-500/40 shadow-lg shadow-red-950/20'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                    p.isHost ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                      <span>{p.name}</span>
                      {isMe && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-extrabold">(YOU)</span>}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {p.isHost ? 'Room Host' : 'Player'}
                    </span>
                  </div>
                </div>

                {p.isHost && (
                  <div className="p-1.5 bg-amber-400/10 border border-amber-400/30 rounded-lg text-amber-400" title="Host">
                    <Crown className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty Slot Placeholders up to maxPlayers */}
          {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="flex items-center justify-center p-4 border border-dashed border-slate-800 rounded-2xl text-slate-600 text-xs font-semibold gap-2"
            >
              <User className="w-4 h-4 opacity-40" />
              <span>Waiting for player...</span>
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-3">
          {isHost ? (
            <button
              onClick={() => onStartGame(code)}
              disabled={!canStart}
              className="w-full py-4 px-6 bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-extrabold text-white shadow-xl shadow-red-950/50 flex items-center justify-center gap-2 text-base transition-all transform active:scale-98"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{players.length < 2 ? 'Need at least 2 players to start' : 'Start Game Now'}</span>
            </button>
          ) : (
            <div className="w-full py-4 bg-slate-950/60 border border-slate-800/80 rounded-xl text-center text-slate-400 text-sm font-semibold flex items-center justify-center gap-2">
              <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping"></div>
              <span>Waiting for the Host ({players.find((p) => p.isHost)?.name || 'Host'}) to start the game...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
