'use client';

import React from 'react';
import type { Piece } from '@/types';
import { PIECE_CONFIG } from '@/types';

interface PiecePaletteProps {
  deployedCounts: Record<string, number>;
  selectedType: string | null;
  onSelectPiece: (type: string) => void;
  playerSide: 'red' | 'blue';
}

export default function PiecePalette({
  deployedCounts,
  selectedType,
  onSelectPiece,
  playerSide,
}: PiecePaletteProps) {
  return (
    <div className="piece-palette flex overflow-x-auto gap-3 pb-2 px-1 max-w-3xl mx-auto">
      {PIECE_CONFIG.map((config) => {
        const remaining = config.count - (deployedCounts[config.type] ?? 0);
        const isSelected = selectedType === config.type;
        const isDepleted = remaining <= 0;

        return (
          <button
            key={config.type}
            onClick={() => !isDepleted && onSelectPiece(config.type)}
            disabled={isDepleted}
            className={`
              flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg transition-all
              ${isSelected ? 'ring-2 ring-[#d4a847]' : 'ring-1 ring-gray-600'}
              ${isDepleted ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#2d4a2d]/50 cursor-pointer'}
              ${isSelected ? 'bg-[#2d4a2d]/70' : 'bg-[#1a2e1a]/80'}
            `}
            title={config.type}
          >
            {/* Mini piece preview */}
            <div
              className={`
                w-10 h-10 flex items-center justify-center rounded-full shadow
                ${playerSide === 'red' ? 'bg-red-600' : 'bg-blue-600'}
              `}
            >
              <span className="text-white text-xs font-bold">
                {getSymbol(config.type)}
              </span>
            </div>

            {/* Count badge */}
            <span className="bg-gray-700 rounded-full px-2 py-0.5 text-xs text-gray-300">
              {remaining}
            </span>

            {/* Label */}
            <span className="text-xs text-gray-400 truncate w-14 text-center">
              {getShortLabel(config.type)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function getSymbol(type: string): string {
  const symbols: Record<string, string> = {
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
  return symbols[type] ?? type[0].toUpperCase();
}

function getShortLabel(type: string): string {
  const labels: Record<string, string> = {
    '5-star': '5★ Gen',
    '4-star': '4★ Gen',
    '3-star': '3★ Gen',
    '2-star': '2★ Gen',
    '1-star': '1★ Gen',
    'colonel': 'Colonel',
    'lieutenant-colonel': 'Lt Col',
    'major': 'Major',
    'captain': 'Captain',
    '1st-lieutenant': '1 Lt',
    '2nd-lieutenant': '2 Lt',
    'sergeant': 'Sgt',
    'private': 'Private',
    'spy': 'Spy',
    'flag': 'Flag',
  };
  return labels[type] ?? type;
}
