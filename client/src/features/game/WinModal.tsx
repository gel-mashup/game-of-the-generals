'use client';

import React, { useState, useEffect } from 'react';

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

const REASON_TEXT: Record<string, string> = {
  flag_captured: 'Flag Captured!',
  flag_baseline: 'Flag Reached Baseline!',
  no_moves: 'No Valid Moves!',
};

export interface WinModalProps {
  winner: 'red' | 'blue' | null;
  reason: 'flag_captured' | 'flag_baseline' | 'no_moves';
  scores: { red: number; blue: number; draws: number; gamesPlayed: number };
  onRematch: () => void;
  onLeave: () => void;
  opponentWantsRematch?: boolean;
  isMinimized?: boolean;
  onMinimize?: () => void;
}

export default function WinModal({
  winner,
  reason,
  scores,
  onRematch,
  onLeave,
  opponentWantsRematch = false,
  isMinimized = false,
  onMinimize,
}: WinModalProps) {
  const [phase, setPhase] = useState<'entering' | 'visible'>('entering');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // Entrance animation: fade in after a brief delay
    const t = setTimeout(() => setPhase('visible'), 100);
    return () => clearTimeout(t);
  }, []);

  const isEntering = phase === 'entering';

  if (isMinimized) {
    return (
      <button
        onClick={onMinimize}
        className="fixed bottom-4 right-4 z-40 px-4 py-2 bg-[#d4a847] hover:bg-[#c49a3f] text-white font-bold rounded-lg shadow-lg transition-colors"
      >
        Show Results
      </button>
    );
  }

  const winnerName = winner === null ? 'Draw' : winner === 'red' ? 'Player 1' : 'Player 2';
  const winnerColor = winner === 'red' ? 'text-red-400' : winner === 'blue' ? 'text-emerald-400' : 'text-gray-400';
  const winnerBg = winner === 'red' ? 'bg-red-600/20 border-red-500' : winner === 'blue' ? 'bg-emerald-600/20 border-emerald-500' : 'bg-gray-600/20 border-gray-500';

  return (
    <div
      className={`
        absolute inset-0 flex items-center justify-center z-50
        bg-black/50 backdrop-blur-sm
        transition-opacity duration-500
        ${isEntering ? 'opacity-0' : 'opacity-100'}
      `}
    >
      <div
        className={`
          relative bg-[#2d4a2d] rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl
          border-2 ${winner === 'red' ? 'border-red-500' : winner === 'blue' ? 'border-blue-500' : 'border-gray-500'}
          transform transition-all duration-500
          ${isEntering ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
        `}
      >
        {/* Trophy / Draw icon */}
        <div className="text-center mb-4">
          <div className={`text-5xl mb-2 ${winnerColor}`}>
            {winner === 'red' ? '🏆' : winner === 'blue' ? '🏆' : '🤝'}
          </div>
        </div>

        {/* Winner banner */}
        <div className="text-center mb-4">
          <h2 className={`text-3xl font-bold mb-1 ${winnerColor}`}>
            {winnerName} Wins!
          </h2>
          <p className="text-[#d4a847] text-lg font-medium">
            {REASON_TEXT[reason] ?? reason}
          </p>
        </div>

        {/* Scores */}
        <div className={`rounded-lg p-4 mb-6 ${winnerBg}`}>
          <div className="flex justify-between items-center text-sm">
            <div className="flex-1 text-center">
              <div className="text-red-400 font-semibold">Player 1</div>
              <div className="text-lg font-bold text-red-300">{scores.red}</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-gray-400 font-semibold">Draws</div>
              <div className="text-lg font-bold text-gray-300">{scores.draws}</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-emerald-400 font-semibold">Player 2</div>
              <div className="text-lg font-bold text-emerald-300">{scores.blue}</div>
            </div>
          </div>
        </div>

        {/* Rematch state */}
        {opponentWantsRematch ? (
          <div className="text-center mb-4">
            <p className="text-yellow-400 font-medium animate-pulse mb-3">
              Opponent wants a rematch…
            </p>
            <button
              onClick={() => { setShowConfirm(true); onRematch(); }}
              className="w-full py-3 bg-[#d4a847] hover:bg-[#c49a3f] active:bg-[#b08a35] text-white font-bold rounded-lg transition-colors"
            >
              Accept Rematch
            </button>
          </div>
        ) : !showConfirm ? (
          <button
            onClick={() => { setShowConfirm(true); onRematch(); }}
            className="w-full py-3 bg-[#d4a847] hover:bg-[#c49a3f] active:bg-[#b08a35] text-white font-bold rounded-lg mb-3 transition-colors"
          >
            Rematch
          </button>
        ) : (
          <div className="text-center text-yellow-400 font-medium mb-3 animate-pulse">
            Waiting for opponent…
          </div>
        )}

        <button
          onClick={onMinimize}
          className="w-full py-2 bg-gray-600/80 hover:bg-gray-600 active:bg-gray-500 text-white font-medium rounded-lg mb-2 transition-colors"
        >
          Show Board
        </button>

        <button
          onClick={onLeave}
          className="w-full py-3 bg-red-600/80 hover:bg-red-600 active:bg-red-500 text-white font-medium rounded-lg transition-colors"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
