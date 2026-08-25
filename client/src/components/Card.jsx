import React from 'react';
import { Ban, RotateCw, Sparkles } from 'lucide-react';

export default function Card({ card, isFaceDown = false, onClick, disabled = false, isPlayable = false, size = 'normal' }) {
  // Opaque Card Back (Official UNO style)
  if (isFaceDown) {
    return (
      <div
        className={`relative rounded-xl sm:rounded-2xl border-2 sm:border-4 border-white bg-[#0f172a] shadow-xl flex items-center justify-center select-none overflow-hidden ${
          size === 'small' ? 'w-9 h-14 xs:w-11 xs:h-18 sm:w-12 sm:h-20 card-small-landscape' : size === 'large' ? 'w-20 h-30 xs:w-24 xs:h-36 sm:w-28 sm:h-44 card-large-landscape' : 'w-13 h-20 xs:w-16 xs:h-24 sm:w-20 sm:h-32 card-normal-landscape'
        }`}
      >
        <div className="w-5/6 h-5/6 rounded-lg sm:rounded-xl bg-[#E53935] p-0.5 sm:p-1 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded flex items-center justify-center transform -rotate-25 shadow-inner">
            <span className="font-title font-black text-[10px] xs:text-xs sm:text-base text-[#FBC02D] tracking-tighter drop-shadow-md">
              UNO
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!card) return null;

  const { color, type, value } = card;

  // Authentic Solid Card Colors (100% Opaque, No Transparency)
  let bgClass = 'bg-slate-800 border-white';
  let symbolColor = 'text-white';
  let ovalTextColor = 'text-slate-950';

  if (color === 'red') {
    bgClass = 'bg-[#E53935] border-white text-white';
    symbolColor = 'text-white';
    ovalTextColor = 'text-[#E53935]';
  } else if (color === 'blue') {
    bgClass = 'bg-[#1E88E5] border-white text-white';
    symbolColor = 'text-white';
    ovalTextColor = 'text-[#1E88E5]';
  } else if (color === 'green') {
    bgClass = 'bg-[#43A047] border-white text-white';
    symbolColor = 'text-white';
    ovalTextColor = 'text-[#43A047]';
  } else if (color === 'yellow') {
    bgClass = 'bg-[#FBC02D] border-white text-slate-950';
    symbolColor = 'text-slate-950';
    ovalTextColor = 'text-[#D8A000]';
  } else if (color === 'wild') {
    bgClass = 'bg-[#1A1A1A] border-white text-white';
    symbolColor = 'text-white';
    ovalTextColor = 'text-white';
  }

  // Symbol / Value renderer helper
  const renderSymbol = (isCorner = false) => {
    const iconSize = isCorner
      ? size === 'small' ? 'w-2 h-2 sm:w-3 sm:h-3' : 'w-2.5 h-2.5 sm:w-4 sm:h-4'
      : size === 'small' ? 'w-4 h-4 sm:w-5 sm:h-5' : size === 'large' ? 'w-6 h-6 sm:w-8 sm:h-8' : 'w-5 h-5 sm:w-7 sm:h-7';

    if (type === 'skip') {
      return <Ban className={iconSize} />;
    }
    if (type === 'reverse') {
      return <RotateCw className={iconSize} />;
    }
    if (type === 'draw2') {
      return <span className={isCorner ? 'text-[9px] sm:text-[11px] font-black' : 'font-black text-base sm:text-2xl'}>+2</span>;
    }
    if (type === 'wild') {
      return <Sparkles className={iconSize} />;
    }
    if (type === 'wild4') {
      return <span className={isCorner ? 'text-[9px] sm:text-[11px] font-black' : 'font-black text-base sm:text-2xl'}>+4</span>;
    }
    return <span className={isCorner ? 'text-[10px] sm:text-xs font-black' : 'font-black text-xl sm:text-4xl'}>{value}</span>;
  };

  const dimensionClasses =
    size === 'small'
      ? 'w-9 h-14 xs:w-11 xs:h-18 sm:w-12 sm:h-20 text-[9px] sm:text-xs card-small-landscape'
      : size === 'large'
      ? 'w-20 h-30 xs:w-24 xs:h-36 sm:w-28 sm:h-44 text-sm sm:text-base card-large-landscape'
      : 'w-13 h-20 xs:w-16 xs:h-24 sm:w-20 sm:h-32 text-xs sm:text-sm card-normal-landscape';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative ${dimensionClasses} rounded-xl sm:rounded-2xl border-2 sm:border-4 shadow-xl sm:shadow-2xl flex flex-col justify-between p-1 sm:p-2 select-none transition-all duration-200 transform overflow-hidden ${bgClass} ${
        isPlayable
          ? '-translate-y-4 sm:-translate-y-6 hover:-translate-y-8 sm:hover:-translate-y-10 cursor-pointer shadow-black/80 z-30'
          : disabled
          ? 'translate-y-0 brightness-75 grayscale-[20%] cursor-not-allowed pointer-events-none shadow-md'
          : 'hover:-translate-y-1'
      }`}
    >
      {/* Top Left Corner Symbol */}
      <div className={`flex items-center gap-0.5 font-black ${symbolColor}`}>
        {renderSymbol(true)}
      </div>

      {/* Authentic Center Tilted White Oval */}
      <div className="absolute inset-0 flex items-center justify-center p-1 sm:p-2 pointer-events-none">
        {color === 'wild' ? (
          /* Official Wild Card 4-Color Segment Wheel inside White Oval */
          <div className="w-full h-3/4 bg-white rounded-[100%] border sm:border-2 border-black/20 flex items-center justify-center transform -rotate-25 overflow-hidden shadow-inner p-0.5 sm:p-1">
            <div className="w-full h-full rounded-[100%] grid grid-cols-2 grid-rows-2 overflow-hidden border border-black/30">
              <div className="bg-[#E53935]"></div>
              <div className="bg-[#1E88E5]"></div>
              <div className="bg-[#FBC02D]"></div>
              <div className="bg-[#43A047]"></div>
            </div>
            <div className="absolute font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] transform rotate-25">
              {renderSymbol(false)}
            </div>
          </div>
        ) : (
          /* Standard Card White Oval */
          <div className="w-full h-3/4 bg-white rounded-[100%] border sm:border-2 border-black/10 shadow-inner flex items-center justify-center transform -rotate-25">
            <div className={`font-black ${ovalTextColor} transform rotate-25 flex items-center justify-center drop-shadow-sm`}>
              {renderSymbol(false)}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Right Corner Symbol */}
      <div className={`flex items-center justify-end font-black ${symbolColor} rotate-180`}>
        {renderSymbol(true)}
      </div>
    </button>
  );
}
