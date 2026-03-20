'use client';

import React from 'react';
import { PIECE_CONFIG } from '@/types';

interface PiecePaletteProps {
  deployedCounts: Record<string, number>;
  selectedType: string | null;
  onSelectPiece: (type: string) => void;
  playerSide: 'red' | 'blue';
}

const TIERS = [
  { label: 'Generals (5\u2605)', types: ['5-star', '4-star'] },
  { label: 'Officers (4-2\u2605)', types: ['3-star', '2-star', '1-star', 'colonel'] },
  { label: 'Special', types: ['lieutenant-colonel', 'major', 'captain', '1st-lieutenant', '2nd-lieutenant', 'sergeant', 'spy'] },
  { label: 'Privates (PVT)', types: ['private'] },
];

export default function PiecePalette({
  deployedCounts,
  selectedType,
  onSelectPiece,
  playerSide,
}: PiecePaletteProps) {
  return (
    <div className="flex flex-col gap-1">
      {TIERS.map((tier) => (
        <div key={tier.label}>
          <h3 className="text-xs font-semibold text-gray-400 px-3 py-1">{tier.label}</h3>
          {tier.types.map((type) => {
            const config = PIECE_CONFIG.find((c) => c.type === type);
            if (!config) return null;
            const remaining = config.count - (deployedCounts[type] ?? 0);
            const isSelected = selectedType === type;
            const isDepleted = remaining <= 0;

            return (
              <button
                key={type}
                onClick={() => !isDepleted && onSelectPiece(type)}
                disabled={isDepleted}
                className={`
                  flex items-center gap-2 px-3 py-2 w-full rounded-lg transition-all
                  ${isSelected ? 'ring-2 ring-[#d4a847] bg-white/10' : 'bg-white/5 hover:bg-white/10'}
                  ${isDepleted ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                `}
                title={type}
              >
                <span className={`
                  w-8 h-8 flex items-center justify-center rounded-full shadow text-xs font-bold text-white
                  ${playerSide === 'red' ? 'bg-red-600' : 'bg-blue-600'}
                `}>
                  {getSymbol(type)}
                </span>
                <span className="flex-1 text-sm text-white">{getShortLabel(type)}</span>
                {remaining > 0 && (
                  <span className="text-xs font-semibold text-gray-300">
                    &#215;{remaining}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function getSymbol(type: string): string {
  const symbols: Record<string, string> = {
    '5-star': '5\u2605',
    '4-star': '4\u2605',
    '3-star': '3\u2605',
    '2-star': '2\u2605',
    '1-star': '1\u2605',
    'colonel': 'Col',
    'lieutenant-colonel': 'LtC',
    'major': 'Maj',
    'captain': 'Cpt',
    '1st-lieutenant': '1Lt',
    '2nd-lieutenant': '2Lt',
    'sergeant': 'Sgt',
    'private': 'Pvt',
    'spy': 'Spy',
    'flag': '\u2691',
  };
  return symbols[type] ?? type[0].toUpperCase();
}

function getShortLabel(type: string): string {
  const labels: Record<string, string> = {
    '5-star': '5\u2605 Gen',
    '4-star': '4\u2605 Gen',
    '3-star': '3\u2605 Gen',
    '2-star': '2\u2605 Gen',
    '1-star': '1\u2605 Gen',
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
