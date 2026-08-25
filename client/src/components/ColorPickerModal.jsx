import React from 'react';
import { Palette } from 'lucide-react';

const COLORS = [
  { id: 'red', name: 'Red', bg: 'bg-red-600 hover:bg-red-500', border: 'border-red-400' },
  { id: 'blue', name: 'Blue', bg: 'bg-blue-600 hover:bg-blue-500', border: 'border-blue-400' },
  { id: 'green', name: 'Green', bg: 'bg-emerald-600 hover:bg-emerald-500', border: 'border-emerald-400' },
  { id: 'yellow', name: 'Yellow', bg: 'bg-yellow-400 hover:bg-yellow-300 text-slate-950', border: 'border-yellow-300' },
];

export default function ColorPickerModal({ onSelectColor }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center flex flex-col items-center">
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400 mb-4">
          <Palette className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-white mb-1">Choose Wild Color</h2>
        <p className="text-slate-400 text-xs font-medium mb-6">
          Select the active color for the next player.
        </p>

        <div className="grid grid-cols-2 gap-4 w-full">
          {COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectColor(c.id)}
              className={`h-24 rounded-2xl ${c.bg} border-2 ${c.border} font-extrabold text-lg shadow-lg flex items-center justify-center transition-all transform hover:scale-105 active:scale-95`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
