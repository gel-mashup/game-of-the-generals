'use client';

import React from 'react';
import { useGameStore } from '@/store/gameStore';
import Piece from './Piece';

const ROWS = 8;
const COLS = 9;

export default function Board() {
  const { board } = useGameStore();

  return (
    <div className="grid grid-cols-9 grid-rows-8 gap-0 w-full max-w-3xl aspect-[9/8] border-4 border-[#2d4a2d] rounded-lg overflow-hidden shadow-2xl">
      {Array.from({ length: ROWS }, (_, rowIndex) =>
        Array.from({ length: COLS }, (_, colIndex) => {
          const isDark = (rowIndex + colIndex) % 2 === 1;
          const piece = board[rowIndex]?.[colIndex];

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              data-row={rowIndex}
              data-col={colIndex}
              className={`
                relative flex items-center justify-center aspect-square
                ${isDark ? 'bg-[#3a6a3a]' : 'bg-[#4a7c4a]'}
                border border-[#2d4a2d]/30
                transition-colors duration-100
              `}
            >
              {piece && (
                <Piece
                  piece={piece}
                  position={{ row: rowIndex, col: colIndex }}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
