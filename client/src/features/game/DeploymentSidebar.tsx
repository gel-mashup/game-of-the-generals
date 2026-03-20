'use client';

import React from 'react';
import PiecePalette from './PiecePalette';
import type { PieceType } from '@/types';

interface DeploymentSidebarProps {
  deployedCounts: Record<string, number>;
  selectedType: string | null;
  onSelectPiece: (type: string) => void;
  playerSide: 'red' | 'blue';
  onAutoDeploy: () => void;
  onReady: () => void;
  allPiecesDeployed: boolean;
  playerReady: boolean;
  totalDeployed: number;
}

export default function DeploymentSidebar({
  deployedCounts,
  selectedType,
  onSelectPiece,
  playerSide,
  onAutoDeploy,
  onReady,
  allPiecesDeployed,
  playerReady,
  totalDeployed,
}: DeploymentSidebarProps) {
  return (
    <div
      className={`
        absolute right-0 top-0 bottom-0 w-[32%] z-30
        bg-[rgba(30,58,95,0.5)] backdrop-blur-md
        border-l border-white/10 rounded-l-lg
        shadow-2xl shadow-black/30
        overflow-y-auto
        transition-transform duration-300 ease-in-out
        translate-x-0
        hidden md:block
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-[#d4a847]">Deploy Your Forces</h2>
        <p className="text-sm text-gray-400">
          {totalDeployed}/21 pieces placed
        </p>
      </div>

      {/* Piece Palette */}
      <PiecePalette
        deployedCounts={deployedCounts}
        selectedType={selectedType}
        onSelectPiece={onSelectPiece}
        playerSide={playerSide}
      />

      {/* Action Buttons */}
      <div className="p-4 flex flex-col gap-2">
        <button
          onClick={onAutoDeploy}
          disabled={playerReady}
          className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          Auto-Deploy
        </button>
        <button
          onClick={onReady}
          disabled={!allPiecesDeployed || playerReady}
          className={`
            w-full px-4 py-2 font-bold rounded-lg transition-colors
            ${playerReady
              ? 'bg-green-700 text-white cursor-default'
              : allPiecesDeployed
                ? 'bg-[#d4a847] hover:bg-[#c49a3f] text-white cursor-pointer'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
          `}
        >
          {playerReady ? 'Ready ✓' : 'Ready'}
        </button>
      </div>
    </div>
  );
}
