'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import { useSocket } from '@/components/SocketProvider';
import { PIECE_CONFIG } from '@/types';
import Board from '@/features/game/Board';
import DeploymentZone from '@/features/game/DeploymentZone';
import PiecePalette from '@/features/game/PiecePalette';
import type { Piece, PieceType } from '@/types';

export default function GamePage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { socket } = useSocket();
  const { players, isBotGame, playerSide, clearRoom } = useRoomStore();
  const { gameStatus, board, setBoard, deployPiece } = useGameStore();

  const [selectedPieceType, setSelectedPieceType] = useState<PieceType | null>(null);
  const [deployedCounts, setDeployedCounts] = useState<Record<string, number>>({});
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Compute deployed counts from board
  useEffect(() => {
    const counts: Record<string, number> = {};
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = board[r][c];
        if (piece && piece.owner === playerSide) {
          counts[piece.type] = (counts[piece.type] ?? 0) + 1;
        }
      }
    }
    setDeployedCounts(counts);
  }, [board, playerSide]);

  // Handle cell click for deployment
  const handleCellClick = (row: number, col: number) => {
    if (gameStatus !== 'deploying' || !selectedPieceType || !playerSide) return;
    if (board[row][col]) return; // Cell occupied

    // Check deployment zone validity
    const isInRedZone = row >= 0 && row <= 2;
    const isInBlueZone = row >= 5 && row <= 7;
    if (playerSide === 'red' && !isInRedZone) return;
    if (playerSide === 'blue' && !isInBlueZone) return;

    const pieceConfig = PIECE_CONFIG.find((p) => p.type === selectedPieceType);
    if (!pieceConfig) return;
    if ((deployedCounts[selectedPieceType] ?? 0) >= pieceConfig.count) return;

    const piece: Piece = {
      id: `${piece.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: selectedPieceType,
      owner: playerSide,
      rank: pieceConfig.rank,
      revealed: false,
    };

    deployPiece(piece, { row, col });
    setSelectedPieceType(null);
  };

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handlePlayerLeft = () => {
      clearRoom();
    };

    socket.on('player:left', handlePlayerLeft);

    return () => {
      socket.off('player:left', handlePlayerLeft);
    };
  }, [socket, clearRoom]);

  const handleLeave = () => {
    if (!socket) return;
    socket.emit('leave-room');
    clearRoom();
    window.location.href = '/';
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#1a2e1a] gap-4">
      {/* Game Header */}
      <div className="w-full max-w-3xl bg-[#2d4a2d] rounded-lg p-4 flex items-center justify-between">
        {/* Room Code */}
        <div>
          <p className="text-gray-400 text-xs">Room</p>
          <p className="font-mono font-bold text-[#d4a847] text-sm">{roomId}</p>
        </div>

        {/* Players */}
        <div className="flex items-center gap-3">
          {players.map((player) => (
            <div
              key={player.id}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                player.side === 'red'
                  ? 'bg-red-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {player.name}
            </div>
          ))}
          {isBotGame && (
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-600/20 text-green-400">
              Bot
            </div>
          )}
        </div>

        {/* Status */}
        <div className="text-right">
          <p className="text-gray-400 text-xs">Status</p>
          <p className="font-medium text-sm capitalize">{gameStatus}</p>
        </div>

        {/* Leave button */}
        {!showLeaveConfirm ? (
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="ml-4 px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Leave
          </button>
        ) : (
          <div className="ml-4 flex items-center gap-2">
            <button
              onClick={handleLeave}
              className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Leave?
            </button>
            <button
              onClick={() => setShowLeaveConfirm(false)}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Board Container */}
      <div className="relative max-w-3xl">
        {/* Deployment Zone Overlay */}
        <DeploymentZone side={playerSide ?? 'red'} isVisible={gameStatus === 'deploying'} />

        {/* Board */}
        <div
          onClick={(e) => {
            const target = e.target as HTMLElement;
            const cell = target.closest('[data-row][data-col]') as HTMLElement | null;
            if (cell) {
              handleCellClick(parseInt(cell.dataset.row!), parseInt(cell.dataset.col!));
            }
          }}
        >
          <Board />
        </div>
      </div>

      {/* Piece Palette — shown during deploying phase */}
      {gameStatus === 'deploying' && (
        <div className="w-full max-w-3xl">
          <div className="mb-2 text-center">
            <h2 className="text-lg font-bold text-[#d4a847]">Deploy Your Forces</h2>
            <p className="text-sm text-gray-400">Place all 21 pieces in your deployment zone</p>
          </div>
          <PiecePalette
            deployedCounts={deployedCounts}
            selectedType={selectedPieceType}
            onSelectPiece={(type) => setSelectedPieceType(type as PieceType)}
            playerSide={playerSide ?? 'red'}
          />
        </div>
      )}

      {/* Waiting / Deploying status */}
      {gameStatus === 'waiting' && (
        <div className="text-center">
          <p className="text-gray-400">Waiting for game to start...</p>
        </div>
      )}
    </main>
  );
}
