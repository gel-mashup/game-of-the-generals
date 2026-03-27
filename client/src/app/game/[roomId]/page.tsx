'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import { useSocket } from '@/components/SocketProvider';
import { PIECE_CONFIG } from '@/types';
import Board from '@/features/game/Board';
import DeploymentZone from '@/features/game/DeploymentZone';
import DeploymentSidebar from '@/features/game/DeploymentSidebar';
import PiecePalette from '@/features/game/PiecePalette';
import BattleReveal from '@/features/game/BattleReveal';
import WinModal from '@/features/game/WinModal';
import type { Piece, PieceType, Position } from '@/types';

export default function GamePage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { socket } = useSocket();
  const {
    players, isBotGame, playerSide, clearRoom,
    scores, setScores,
    opponentWantsRematch, setOpponentWantsRematch,
    iWantRematch, setIWantRematch,
    isHost,
  } = useRoomStore();
  const {
    gameStatus, board, setBoard, deployPiece,
    selectPiece, makeMove, setGameStatus, setTurn,
    playerReady, opponentReady, setOpponentReady,
    countdownSeconds, setCountdownSeconds,
    battleOutcome, setBattleOutcome, clearBattleOutcome,
    setReady,
    winner, winReason, setWinner, resetForRematch,
  } = useGameStore();

  const [selectedPieceType, setSelectedPieceType] = useState<PieceType | null>(null);
  const [deployedCounts, setDeployedCounts] = useState<Record<string, number>>({});
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [botThinking, setBotThinking] = useState(false);
  const [winModalMinimized, setWinModalMinimized] = useState(false);

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

  // Reset win modal state when game restarts
  useEffect(() => {
    if (gameStatus !== 'finished') {
      setWinModalMinimized(false);
    }
  }, [gameStatus]);

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

      // Clicking own piece — select
      if (target && target.owner === playerSide) {
        selectPiece({ row, col });
        return;
      }
      // Clicking valid move square — make move (includes attacks on enemy pieces)
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

    // Request current game state on mount (handles late join / missed events)
    socket.emit('sync-game-state');

    const handleGameStarted = (data: {
      board: (Piece | null)[][];
      currentTurn: 'red' | 'blue';
      status: 'deploying';
    }) => {
      setBoard(data.board);
      setGameStatus('deploying');
      setTurn(data.currentTurn);
    };

    const handlePieceDeployed = (data: { piece: Piece; row: number; col: number; deployedCount: number; board: (Piece | null)[][]; autoDeployComplete?: boolean }) => {
      setBoard(data.board);
      const counts: Record<string, number> = {};
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 9; c++) {
          const p = data.board[r][c];
          if (p && p.owner === playerSide) {
            counts[p.type] = (counts[p.type] ?? 0) + 1;
          }
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
      setCountdownSeconds(null); // Clear countdown overlay after "Go!"
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

    socket.on('game:started', handleGameStarted);
    socket.on('piece:deployed', handlePieceDeployed);
    socket.on('player:ready', handlePlayerReady);
    socket.on('deploy:complete', handleDeployComplete);
    socket.on('move:result', handleMoveResult);
    socket.on('countdown:update', handleCountdownUpdate);
    socket.on('error', handleError);
    socket.on('player:left', handlePlayerLeft);

    // WIN-04: Game over — winner announcement
    socket.on('game:over', (data: {
      winner: 'red' | 'blue' | null;
      reason: 'flag_captured' | 'flag_baseline' | 'no_moves';
      scores: { red: number; blue: number; draws: number; gamesPlayed: number };
      board: (Piece | null)[][];
    }) => {
      setBoard(data.board);
      setScores(data.scores);
      setWinner(data.winner, data.reason);
      setGameStatus('finished');
      // Clear any rematch state from previous game
      setOpponentWantsRematch(false);
      setIWantRematch(false);
    });

    // SES-01: Score update from server
    socket.on('scores:update', (data: {
      scores: { red: number; blue: number; draws: number; gamesPlayed: number };
    }) => {
      setScores(data.scores);
    });

    // SES-02: Rematch state from server
    socket.on('rematch:ready', (data: { bothReady: boolean }) => {
      if (data.bothReady) {
        // Both confirmed — server will send rematch:confirmed next
        setOpponentWantsRematch(false);
      } else {
        // Opponent wants rematch — show prompt
        setOpponentWantsRematch(true);
      }
    });

    socket.on('rematch:timeout', () => {
      setOpponentWantsRematch(false);
      setIWantRematch(false);
    });

    socket.on('rematch:confirmed', (data: {
      board: (Piece | null)[][];
      scores: { red: number; blue: number; draws: number; gamesPlayed: number };
    }) => {
      setScores(data.scores);
      resetForRematch();
      setBoard(data.board);
      setOpponentWantsRematch(false);
      setIWantRematch(false);
      setWinner(null, null);
    });

    // Bot auto-deploy trigger
    socket.on('bot:auto-deploy', () => {
      socket.emit('auto-deploy');
    });

    // AI-04: Bot thinking indicator
    socket.on('bot:thinking-start', () => setBotThinking(true));
    socket.on('bot:thinking-end', () => setBotThinking(false));

    return () => {
      socket.off('game:started', handleGameStarted);
      socket.off('piece:deployed', handlePieceDeployed);
      socket.off('player:ready', handlePlayerReady);
      socket.off('deploy:complete', handleDeployComplete);
      socket.off('move:result', handleMoveResult);
      socket.off('countdown:update', handleCountdownUpdate);
      socket.off('error', handleError);
      socket.off('player:left', handlePlayerLeft);
      socket.off('game:over');
      socket.off('scores:update');
      socket.off('rematch:ready');
      socket.off('rematch:timeout');
      socket.off('rematch:confirmed');
      socket.off('bot:auto-deploy');
      socket.off('bot:thinking-start');
      socket.off('bot:thinking-end');
    };
  }, [
    socket, clearRoom, setBoard, setGameStatus, setTurn,
    setOpponentReady, setCountdownSeconds, setBattleOutcome,
    setWinner, resetForRematch, setScores, setOpponentWantsRematch, setIWantRematch,
    setBotThinking,
  ]);

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

  const handleResetScores = () => {
    if (!socket || !isHost) return;
    socket.emit('reset-scores');
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-[#1a2e1a] gap-4">
      {/* Error toast */}
      {errorMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {errorMsg}
        </div>
      )}

      {/* Game Header */}
      <div className="w-full max-w-3xl bg-[#2d4a2d] rounded-lg p-4 flex items-center justify-between gap-4">
        {/* Room Code */}
        <div className="flex-shrink-0">
          <p className="text-gray-400 text-xs">Room</p>
          <p className="font-mono font-bold text-[#d4a847] text-sm">{roomId}</p>
        </div>

        {/* Score display — always visible */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-400 font-medium">P1: {scores.red}</span>
            </div>
            <span className="text-gray-500">|</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-gray-400">Draws: {scores.draws}</span>
            </div>
            <span className="text-gray-500">|</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-400 font-medium">P2: {scores.blue}</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex-shrink-0 text-right">
          <p className="text-gray-400 text-xs">Status</p>
          <p className="font-medium text-sm capitalize">{gameStatus}</p>
        </div>

        {/* Leave button */}
        {!showLeaveConfirm ? (
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="flex-shrink-0 ml-2 px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Leave
          </button>
        ) : (
          <div className="flex-shrink-0 ml-2 flex items-center gap-2">
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

        {/* Reset Scores button — host only */}
        {isHost && (
          <button
            onClick={handleResetScores}
            className="flex-shrink-0 ml-2 px-3 py-2 bg-yellow-600/80 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Reset Scores
          </button>
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

      {/* Board Container — relative for overlays */}
      <div className="relative w-full max-w-3xl">
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

        {/* Win Modal overlay — shown when game is finished */}
        {gameStatus === 'finished' && winner !== null && (
          <WinModal
            winner={winner}
            reason={winReason ?? 'flag_captured'}
            scores={scores}
            onRematch={() => {
              if (!socket) return;
              setIWantRematch(true);
              socket.emit('rematch');
            }}
            onLeave={handleLeave}
            opponentWantsRematch={opponentWantsRematch}
            isMinimized={winModalMinimized}
            onMinimize={() => setWinModalMinimized(!winModalMinimized)}
          />
        )}

        {/* AI-04: Bot thinking indicator — board overlay */}
        {botThinking && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-40 pointer-events-none">
            <p className="text-white text-xl font-medium animate-pulse">
              Bot is thinking...
            </p>
          </div>
        )}
      </div>

      {/* Deployment sidebar — absolute overlay at page right edge (desktop only) */}
      {gameStatus === 'deploying' && (
        <DeploymentSidebar
          deployedCounts={deployedCounts}
          selectedType={selectedPieceType}
          onSelectPiece={(type) => setSelectedPieceType(type as PieceType)}
          playerSide={playerSide ?? 'red'}
          onAutoDeploy={handleAutoDeploy}
          onReady={handleReady}
          allPiecesDeployed={allPiecesDeployed}
          playerReady={playerReady}
          totalDeployed={totalDeployed}
        />
      )}

      {/* Playing phase status */}
      {gameStatus === 'playing' && (
        <div className="w-full max-w-3xl text-center text-gray-400 text-sm">
          Tap your piece to select, then tap a green square to move
        </div>
      )}

      {/* Mobile deployment fallback — shown below 768px during deployment */}
      {gameStatus === 'deploying' && (
        <div className="md:hidden w-full max-w-3xl">
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
