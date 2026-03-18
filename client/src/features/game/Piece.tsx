'use client';

import React, { useState } from 'react';
import type { Piece, Position } from '@/types';

const PIECE_SYMBOLS: Record<string, string> = {
  '5-star': '5★',
  '4-star': '4★',
  '3-star': '3★',
  '2-star': '2★',
  '1-star': '1★',
  'colonel': 'Col',
  'lieutenant-colonel': 'LtC',
  'major': 'Maj',
  'captain': 'Cpt',
  '1st-lieutenant': '1Lt',
  '2nd-lieutenant': '2Lt',
  'sergeant': 'Sgt',
  'private': 'Pvt',
  'spy': 'Spy',
  'flag': '⚑',
};

interface PieceProps {
  piece: Piece;
  position: Position;
  onClick?: () => void;
  isSelected?: boolean;
  onInvalidClick?: () => void;
}

export default function Piece({ piece, position, onClick, isSelected, onInvalidClick }: PieceProps) {
  const [flashing, setFlashing] = useState(false);
  const symbol = PIECE_SYMBOLS[piece.type] ?? piece.type[0].toUpperCase();

  const handleClick = () => {
    if (flashing) return;
    if (onInvalidClick) {
      setFlashing(true);
      onInvalidClick();
      setTimeout(() => setFlashing(false), 200);
    }
    if (onClick) onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`
        w-full h-full flex items-center justify-center p-1
        rounded-full shadow-lg
        transition-all duration-150
        ${piece.owner === 'red' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}
        ${!piece.revealed ? 'opacity-60' : ''}
        ${onClick || onInvalidClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
        ${isSelected ? 'ring-2 ring-[#d4a847] ring-2' : ''}
        ${flashing ? 'bg-red-800' : ''}
        relative
      `}
      title={piece.type}
    >
      {flashing && (
        <div className="absolute inset-0 rounded-full bg-[rgba(192,57,43,0.6)] animate-ping" />
      )}
      <span className="text-white text-xs font-bold select-none drop-shadow">
        {symbol}
      </span>
    </button>
  );
}

export { PIECE_SYMBOLS };
