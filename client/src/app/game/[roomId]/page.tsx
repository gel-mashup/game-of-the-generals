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
import BattleReveal from '@/features/game/BattleReveal';
import type { Piece, PieceType, Position } from '@/types';

export default function GamePage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { socket } = useSocket();
  const { players, isBotGame, playerSide, clearRoom } = useRoomStore();
  const {
    gameStatus, board, setBoard, deployPiece,
    selectPiece, makeMove, setGameStatus, setTurn,
    playerReady, opponentReady, setOpponentReady,
    countdownSeconds, setCountdownSeconds,
    battleOutcome, setBattleOutcome, clearBattleOutcome,
    setReady,
  } = useGameStore();

  const [selectedPieceType, setSelectedPieceType] = useState<PieceType | null>(null);
  const [deployedCounts, setDeployedCounts] = useState<Record<string, number>>({});
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const totalDeployed = Object.values(deployedCounts).reduce((a, b) => a + b, 0);
  const allPiecesDeployed = totalDeployed === 21;

  // Handle cell click for deployment and playing phases
  const handleCellClick = (row: number, col: number) => {
    if (!playerSide) return;

    if (gameStatus === 'deploying') {
      if (!selectedPieceType || board[row][col]) return;
      const isInRedZone = row >= 0 && row <= 2;
      const isInBlueZone = row >= 5 && row <= 7;
      if (playerSide === 'red' && !isInRedZone) return;
      if (playerSide === 'blue' && !isInBlueZone) return;

      const pieceConfig = PIECE_CONFIG.find((p) => p.type === selectedPieceType);
      if (!pieceConfig) return;
      if ((deployedCounts[selectedPieceType] ?? 0) >= pieceConfig.count) return;

      const piece: Piece = {
        id: `${selectedPieceType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: selectedPieceType,
        owner: playerSide,
        rank: pieceConfig.rank,
        revealed: false,
      };

      deployPiece(piece, { row, col });
      socket?.emit('deploy-piece', { pieceId: piece.id, row, col });
      setSelectedPieceType(null);
      return;
    }

    if (gameStatus === 'playing') {
      const state = useGameStore.getState();
      const { board: currentBoard, validMoves, selectedPiece } = state;
      const target = currentBoard[row][col];
      // Clicking opponent piece — deselect
      if (target && target.owner !== playerSide) {
        selectPiece(null);
        return;
      }
      // Clicking own piece — select
      if (target && target.owner === playerSide) {
        selectPiece({ row, col });
        return;
      }
      // Clicking empty valid-move square — make move
      if (selectedPiece && validMoves.some((m) => m.row === row && m.col === col)) {
        makeMove(selectedPiece, { row, col });
        socket?.emit('make-move', { from: selectedPiece, to: { row, col } });
        return;
      }
      // Clicking elsewhere — deselect
      selectPiece(null);
    }
  };

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handlePieceDeployed = (data: { piece: Piece; row: number; col: number; deployedCount: number; board: (Piece | null)[][]; autoDeployComplete?: boolean }) => {
      setBoard(data.board);
      const counts: Record<string, number> = {};
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 9; c++) {
          const p = data.board[r][c];
          if (p) counts[p.type] = (counts[p.type] ?? 0) + 1;
        }
      }
      setDeployedCounts(counts);
    };

    const handlePlayerReady = (data: { playerId: string }) => {
      setOpponentReady(true);
    };

    const handleDeployComplete = (data: { board: (Piece | null)[][]; currentTurn: 'red' | 'blue' }) => {
      setBoard(data.board);
      setGameStatus('playing');
      setTurn(data.currentTurn);
    };

    const handleMoveResult = (data: { move: { from: Position; to: Position }; outcome: any; attacker: Piece | null; defender: Piece | null; attackerPosition: Position; defenderPosition: Position; board: (Piece | null)[][]; currentTurn: 'red' | 'blue' }) => {
      setBoard(data.board);
      setTurn(data.currentTurn);
      if (data.attacker && data.defender && data.outcome) {
        let result: 'attacker_wins' | 'defender_wins' | 'tie' = 'tie';
        if (data.outcome.winner === 'tie') {
          result = 'tie';
        } else if (data.outcome.attackerWins === true) {
          result = 'attacker_wins';
        } else if (data.outcome.attackerWins === false) {
          result = 'defender_wins';
        }
        setBattleOutcome({
          attacker: data.attacker,
          defender: data.defender,
          attackerPosition: data.attackerPosition,
          defenderPosition: data.defenderPosition,
          result,
        });
      }
    };

    const handleCountdownUpdate = (data: { seconds: number }) => {
      setCountdownSeconds(data.seconds);
    };

    const handleError = (data: { message: string }) => {
      setErrorMsg(data.message);
      setTimeout(() => setErrorMsg(null), 4000);
    };

    const handlePlayerLeft = () => {
      clearRoom();
    };

    socket.on('piece:deployed', handlePieceDeployed);
    socket.on('player:ready', handlePlayerReady);
    socket.on('deploy:complete', handleDeployComplete);
    socket.on('move:result', handleMoveResult);
    socket.on('countdown:update', handleCountdownUpdate);
    socket.on('error', handleError);
    socket.on('player:left', handlePlayerLeft);

    return () => {
      socket.off('piece:deployed', handlePieceDeployed);
      socket.off('player:ready', handlePlayerReady);
      socket.off('deploy:complete', handleDeployComplete);
      socket.off('move:result', handleMoveResult);
      socket.off('countdown:update', handleCountdownUpdate);
      socket.off('error', handleError);
      socket.off('player:left', handlePlayerLeft);
    };
  }, [socket, clearRoom, setBoard, setGameStatus, setTurn, setOpponentReady, setCountdownSeconds, setBattleOutcome]);

  const handleAutoDeploy = () => {
    if (!socket || !playerSide) return;
    socket.emit('auto-deploy');
  };

  const handleReady = () => {
    if (!socket || !allPiecesDeployed || playerReady) return;
    socket.emit('ready');
    setReady();
  };

  const handleLeave = () => {
    if (!socket) return;
    socket.emit('leave-room');
    clearRoom();
    window.location.href = '/';
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#1a2e1a] gap-4">
      {/* Error toast */}
      {errorMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {errorMsg}
        </div>
      )}

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
              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                player.side === 'red'
                  ? 'bg-red-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {player.name}
              {opponentReady && player.side !== playerSide && (
                <span className="ml-1 text-xs">✓</span>
              )}
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

      {/* Countdown overlay */}
      {countdownSeconds !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="text-6xl font-bold text-[#d4a847] animate-pulse">
            {countdownSeconds > 0 ? `${countdownSeconds}…` : 'Go!'}
          </div>
        </div>
      )}

      {/* Board Container */}
      <div className="relative max-w-3xl w-full">
        {/* Deployment Zone Overlay */}
        <DeploymentZone side={playerSide ?? 'red'} isVisible={gameStatus === 'deploying'} />

        {/* Board */}
        <Board onCellClick={handleCellClick} />

        {/* Battle Reveal overlay */}
        {battleOutcome && (
          <div className="absolute inset-0">
            <BattleReveal
              attacker={battleOutcome.attacker}
              defender={battleOutcome.defender}
              attackerPosition={battleOutcome.attackerPosition}
              defenderPosition={battleOutcome.defenderPosition}
              outcome={battleOutcome}
              onComplete={clearBattleOutcome}
            />
          </div>
        )}
      </div>

      {/* Playing phase status */}
      {gameStatus === 'playing' && (
        <div className="w-full max-w-3xl text-center text-gray-400 text-sm">
          Tap your piece to select, then tap a green square to move
        </div>
      )}

      {/* Deployment phase controls */}
      {gameStatus === 'deploying' && (
        <div className="w-full max-w-3xl">
          <div className="mb-2 text-center">
            <h2 className="text-lg font-bold text-[#d4a847]">Deploy Your Forces</h2>
            <p className="text-sm text-gray-400">
              {totalDeployed}/21 pieces placed
            </p>
          </div>
          <PiecePalette
            deployedCounts={deployedCounts}
            selectedType={selectedPieceType}
            onSelectPiece={(type) => setSelectedPieceType(type as PieceType)}
            playerSide={playerSide ?? 'red'}
          />

          {/* Auto-Deploy and Ready buttons */}
          <div className="flex gap-3 mt-3">
            <button
              onClick={handleAutoDeploy}
              disabled={playerReady}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              Auto-Deploy
            </button>
            <button
              onClick={handleReady}
              disabled={!allPiecesDeployed || playerReady}
              className={`
                flex-[2] px-4 py-2 font-bold rounded-lg transition-colors
                ${allPiecesDeployed && !playerReady
                  ? 'bg-[#d4a847] hover:bg-[#c49a3f] text-white cursor-pointer'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
              `}
            >
              {playerReady ? 'Ready ✓' : 'Ready'}
            </button>
          </div>
        </div>
      )}

      {/* Waiting status */}
      {gameStatus === 'waiting' && (
        <div className="text-center">
          <p className="text-gray-400">Waiting for game to start...</p>
        </div>
      )}
    </main>
  );
}
