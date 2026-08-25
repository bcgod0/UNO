import React, { useState } from 'react';
import { PlusCircle, LogIn, Sparkles, Users, Layers, ShieldCheck } from 'lucide-react';

export default function Home({ onCreateRoom, onJoinRoom, error, isConnected }) {
  const [username, setUsername] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [mode, setMode] = useState('menu'); // 'menu' | 'create' | 'join'

  const handleCreate = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    onCreateRoom(username.trim(), maxPlayers);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!username.trim() || !roomCodeInput.trim()) return;
    onJoinRoom(username.trim(), roomCodeInput.trim());
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 overflow-hidden select-none">
      {/* Background Decorative Blur Blobs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/80 flex flex-col items-center">
        {/* UNO Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-2">
            <div className="bg-gradient-to-r from-red-600 via-yellow-500 to-green-500 p-1.5 rounded-2xl shadow-lg transform -rotate-2 hover:rotate-0 transition-transform duration-300">
              <div className="bg-slate-950 px-6 py-2 rounded-xl flex items-center gap-2">
                <span className="font-title font-black text-4xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-green-400 drop-shadow-md">
                  UNO!
                </span>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-black px-2 py-0.5 rounded text-white tracking-widest uppercase">
                  ONLINE
                </span>
              </div>
            </div>
          </div>
          <p className="text-slate-400 text-sm font-medium">Real-time Multiplayer Experience</p>
        </div>

        {/* Server Connection Status Banner */}
        {!isConnected && (
          <div className="w-full mb-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs text-center font-medium animate-pulse">
            ⏳ Connecting to server... (Render free tier may take ~30s to wake up on first visit)
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="w-full mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-medium animate-pulse">
            ⚠️ {error}
          </div>
        )}

        {/* Username Input */}
        <div className="w-full mb-6">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 ml-1">
            Your Display Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. MasterGamer"
              maxLength={15}
              className="w-full bg-slate-950/70 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
              required
            />
          </div>
        </div>

        {/* Mode Selector / Forms */}
        {mode === 'menu' ? (
          <div className="w-full flex flex-col gap-4">
            <button
              onClick={() => setMode('create')}
              disabled={!username.trim()}
              className="w-full py-4 px-6 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-white shadow-lg shadow-red-950/50 flex items-center justify-center gap-3 transition-all duration-200 transform active:scale-98"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create New Room</span>
            </button>

            <button
              onClick={() => setMode('join')}
              disabled={!username.trim()}
              className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-white flex items-center justify-center gap-3 transition-all duration-200 transform active:scale-98"
            >
              <LogIn className="w-5 h-5 text-indigo-400" />
              <span>Join Existing Room</span>
            </button>
          </div>
        ) : mode === 'create' ? (
          /* Create Room Options Sub-form */
          <form onSubmit={handleCreate} className="w-full flex flex-col gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 ml-1 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Max Player Limit</span>
              </label>

              {/* Room Size Selector Pills */}
              <div className="grid grid-cols-4 gap-2">
                {[2, 3, 4, 6, 8, 10, 11].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setMaxPlayers(size)}
                    className={`py-2.5 rounded-xl font-bold text-sm border transition-all ${
                      maxPlayers === size
                        ? 'bg-red-600 border-red-400 text-white shadow-md shadow-red-900/40 scale-105'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {size} Players
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-1">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-slate-300 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!username.trim()}
                className="flex-2 py-3.5 px-6 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-white shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 transition-all"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Create ({maxPlayers} Players)</span>
              </button>
            </div>
          </form>
        ) : (
          /* Join Room Input Sub-form */
          <form onSubmit={handleJoin} className="w-full flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 ml-1">
                Room Code (4-6 Alphanumeric)
              </label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. UNO78"
                maxLength={6}
                className="w-full bg-slate-950/70 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 font-bold uppercase tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                required
              />
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-slate-300 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!roomCodeInput.trim() || !username.trim()}
                className="flex-2 py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-white shadow-lg shadow-blue-950/50 flex items-center justify-center gap-2 transition-all"
              >
                <LogIn className="w-5 h-5" />
                <span>Join Game</span>
              </button>
            </div>
          </form>
        )}

        {/* Feature Highlights Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 w-full flex justify-around text-slate-400 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>2 - 11 Players</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-yellow-400" />
            <span>108 Deck Cards</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-rose-400" />
            <span>Real-time Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}
