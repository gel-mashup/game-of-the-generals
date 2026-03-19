'use client';

import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import Piece from './Piece';

const ROWS = 8;
const COLS = 9;

interface BoardProps {
  onCellClick?: (row: number, col: number) => void;
  onOpponentPieceClick?: (row: number, col: number) => void;
}

export default function Board({ onCellClick, onOpponentPieceClick }: BoardProps) {
  const { board, selectedPiece, validMoves, currentTurn, gameStatus, selectPiece } = useGameStore();
  const { playerSide } = useRoomStore();

  const isValidMove = (row: number, col: number) =>
    validMoves.some((m) => m.row === row && m.col === col);

  const showTurnIndicator = gameStatus === 'playing' && playerSide;
  const isMyTurn = currentTurn === playerSide;

  const handleCellClick = (row: number, col: number) => {
    onCellClick?.(row, col);
  };

  const handlePieceClick = (row: number, col: number) => {
    const piece = board[row]?.[col];
    if (!piece) {
      handleCellClick(row, col);
      return;
    }
    // Opponent piece — pass to page handler (validates if it's an attack)
    if (piece.owner !== playerSide) {
      onOpponentPieceClick?.(row, col);
      handleCellClick(row, col);
      return;
    }
    // Own piece
    handleCellClick(row, col);
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-3xl">
      {showTurnIndicator && (
        <div className={`text-center font-bold text-lg ${isMyTurn ? 'text-[#d4a847]' : 'text-gray-400'}`}>
          {isMyTurn ? 'Your turn' : 'Waiting for opponent…'}
        </div>
      )}
      <div className="relative grid grid-cols-9 grid-rows-8 gap-0 aspect-[9/8] border-4 border-[#2d4a2d] rounded-lg overflow-hidden shadow-2xl">
        {Array.from({ length: ROWS }, (_, rowIndex) =>
          Array.from({ length: COLS }, (_, colIndex) => {
            const isDark = (rowIndex + colIndex) % 2 === 1;
            const piece = board[rowIndex]?.[colIndex];
            const isSelected = selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex;
            const hasValidMove = isValidMove(rowIndex, colIndex);

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                data-row={rowIndex}
                data-col={colIndex}
                onClick={() => handlePieceClick(rowIndex, colIndex)}
                className={`
                  relative flex items-center justify-center aspect-square
                  ${isDark ? 'bg-[#3a6a3a]' : 'bg-[#4a7c4a]'}
                  border border-[#2d4a2d]/30
                  transition-colors duration-100
                  ${hasValidMove ? 'bg-[rgba(74,124,74,0.5)]' : ''}
                `}
              >
                {piece && (
                  <Piece
                    piece={piece}
                    position={{ row: rowIndex, col: colIndex }}
                    isSelected={isSelected}
                    onClick={() => piece.owner === playerSide ? handleCellClick(rowIndex, colIndex) : undefined}
                    onInvalidClick={() => onOpponentPieceClick?.(rowIndex, colIndex)}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
