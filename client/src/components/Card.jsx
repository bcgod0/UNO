import React from 'react';
import { Ban, RotateCw, Plus, Sparkles } from 'lucide-react';

export default function Card({ card, isFaceDown = false, onClick, disabled = false, isPlayable = false, size = 'normal' }) {
  if (isFaceDown) {
    return (
      <div
        className={`relative rounded-xl border-2 border-slate-700 bg-slate-900 shadow-md flex items-center justify-center select-none ${
          size === 'small' ? 'w-10 h-16 sm:w-12 sm:h-20' : 'w-16 h-24 sm:w-20 sm:h-32'
        }`}
      >
        <div className="w-5/6 h-5/6 rounded-lg bg-gradient-to-br from-red-600 via-yellow-500 to-blue-600 p-0.5 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
            <span className="font-title font-black text-xs sm:text-sm text-yellow-400 -rotate-45 tracking-tighter">
              UNO
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!card) return null;

  const { color, type, value } = card;

  // Background Styles based on Color
  let bgStyle = 'bg-slate-800';
  let textColor = 'text-white';
  let ovalBg = 'bg-white';
  let ovalTextColor = 'text-slate-950';

  if (color === 'red') {
    bgStyle = 'bg-gradient-to-br from-red-500 to-red-600 border-red-400';
    textColor = 'text-white';
    ovalTextColor = 'text-red-600';
  } else if (color === 'blue') {
    bgStyle = 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400';
    textColor = 'text-white';
    ovalTextColor = 'text-blue-600';
  } else if (color === 'green') {
    bgStyle = 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400';
    textColor = 'text-white';
    ovalTextColor = 'text-emerald-600';
  } else if (color === 'yellow') {
    bgStyle = 'bg-gradient-to-br from-yellow-400 to-amber-500 border-yellow-300';
    textColor = 'text-slate-950';
    ovalTextColor = 'text-amber-500';
  } else if (color === 'wild') {
    bgStyle = 'bg-gradient-to-br from-red-500 via-yellow-400 to-blue-600 border-yellow-300';
    textColor = 'text-white';
    ovalTextColor = 'text-slate-950';
  }

  // Symbol / Value renderer helper
  const renderSymbol = (isCorner = false) => {
    const iconSize = isCorner ? (size === 'small' ? 'w-3 h-3' : 'w-3.5 h-3.5') : (size === 'small' ? 'w-5 h-5' : 'w-7 h-7');

    if (type === 'skip') {
      return <Ban className={iconSize} />;
    }
    if (type === 'reverse') {
      return <RotateCw className={iconSize} />;
    }
    if (type === 'draw2') {
      return <span className={isCorner ? 'text-[10px] font-extrabold' : 'font-black text-lg'}>+2</span>;
    }
    if (type === 'wild') {
      return <Sparkles className={iconSize} />;
    }
    if (type === 'wild4') {
      return <span className={isCorner ? 'text-[10px] font-extrabold' : 'font-black text-lg'}>+4</span>;
    }
    return <span className={isCorner ? 'text-[11px] font-extrabold' : 'font-black text-2xl sm:text-3xl'}>{value}</span>;
  };

  const dimensionClasses =
    size === 'small'
      ? 'w-12 h-20 text-xs'
      : size === 'large'
      ? 'w-24 h-36 sm:w-28 sm:h-44 text-base'
      : 'w-16 h-24 sm:w-20 sm:h-32 text-sm';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative ${dimensionClasses} rounded-2xl border-2 shadow-xl flex flex-col justify-between p-1.5 sm:p-2 select-none transition-all duration-200 transform ${bgStyle} ${
        isPlayable
          ? 'cursor-pointer hover:-translate-y-4 hover:scale-105 hover:ring-4 hover:ring-white/80 animate-pulse-glow z-10'
          : disabled
          ? 'cursor-not-allowed opacity-80'
          : 'hover:-translate-y-1'
      }`}
    >
      {/* Top Left Corner */}
      <div className={`flex items-center gap-0.5 font-bold ${textColor}`}>
        {renderSymbol(true)}
      </div>

      {/* Center Oval */}
      <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none">
        <div
          className={`w-full h-3/4 ${ovalBg} rounded-[100%] shadow-inner flex items-center justify-center transform -rotate-12 border border-black/10`}
        >
          <div className={`font-black ${ovalTextColor} transform rotate-12 flex items-center justify-center`}>
            {renderSymbol(false)}
          </div>
        </div>
      </div>

      {/* Bottom Right Corner */}
      <div className={`flex items-center justify-end font-bold ${textColor} rotate-180`}>
        {renderSymbol(true)}
      </div>
    </button>
  );
}
