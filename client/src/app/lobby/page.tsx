'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '@/components/SocketProvider';
import { useRoomStore } from '@/store/roomStore';

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket } = useSocket();
  const { setRoom, addPlayer, removePlayer, clearRoom, players } = useRoomStore();

  const mode = searchParams.get('mode') || 'online';
  const nameFromUrl = searchParams.get('name') || '';
  const roomFromUrl = searchParams.get('room') || null;

  const [playerName, setPlayerName] = useState(nameFromUrl);
  const [roomCode, setRoomCode] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [canAddBot, setCanAddBot] = useState(false);
  const [canStartGame, setCanStartGame] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Clear room state on mount
  useEffect(() => {
    clearRoom();
  }, [clearRoom]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = ({
      roomId,
      playerId,
      playerSide,
      isBotGame,
    }: {
      roomId: string;
      playerId: string;
      playerSide: 'red' | 'blue';
      isBotGame: boolean;
    }) => {
      setRoom(roomId, playerId, playerSide, true, isBotGame);
      setCreatedRoomId(roomId);
      setIsHost(true);
      setCanAddBot(true);
    };

    const handleRoomJoined = ({
      roomId,
      playerId,
      playerSide,
      isHost = false,
    }: {
      roomId: string;
      playerId: string;
      playerSide: 'red' | 'blue';
      isHost?: boolean;
    }) => {
      setRoom(roomId, playerId, playerSide, isHost, false);
      setCreatedRoomId(roomId);
      setIsJoined(true);
      setIsHost(isHost);
      if (isHost) {
        setCanAddBot(true);
      }
    };

    const handlePlayerJoined = ({ player }: { player: { id: string; name: string; side: string } }) => {
      addPlayer(player as any);
      setIsJoined(true);
    };

    const handlePlayerLeft = ({ playerId }: { playerId: string; reason: string }) => {
      removePlayer(playerId);
      setIsJoined(false);
    };

    const handleError = ({ message }: { message: string }) => {
      setError(message);
      setTimeout(() => setError(null), 5000);
    };

    const handleGameStarted = () => {
      console.log('game:started received in lobby, createdRoomId:', createdRoomId);
      setCanAddBot(false);
      setCanStartGame(false);
      // Navigate to game when game starts (after bot added or player joined)
      // Use the roomId from URL params as fallback
      const roomId = createdRoomId || searchParams.get('room');
      if (roomId) {
        console.log('Navigating to game:', roomId);
        router.push(`/game/${roomId}`);
      } else {
        console.log('No roomId found');
      }
    };

    socket.on('room:created', handleRoomCreated);
    socket.on('room:joined', handleRoomJoined);
    socket.on('player:joined', handlePlayerJoined);
    socket.on('player:left', handlePlayerLeft);
    socket.on('error', handleError);
    socket.on('game:started', handleGameStarted);

    return () => {
      socket.off('room:created', handleRoomCreated);
      socket.off('room:joined', handleRoomJoined);
      socket.off('player:joined', handlePlayerJoined);
      socket.off('player:left', handlePlayerLeft);
      socket.off('error', handleError);
      socket.off('game:started', handleGameStarted);
    };
  }, [socket, setRoom, addPlayer, removePlayer, clearRoom]);

  // Listen for room updates to control button visibility
  useEffect(() => {
    if (!socket || !isHost) return;

    const handleGameStarted = ({ status }: { status: string }) => {
      if (status === 'deploying') {
        setCanAddBot(false);
        setCanStartGame(false);
      }
    };

    const handlePlayerJoined = () => {
      setCanStartGame(true);
    };

    const handlePlayerLeft = () => {
      setCanStartGame(false);
      setCanAddBot(true);
    };

    socket.on('game:started', handleGameStarted);
    socket.on('player:joined', handlePlayerJoined);
    socket.on('player:left', handlePlayerLeft);

    // Initial state - can add bot if waiting and room not full
    if (createdRoomId && !isJoined) {
      setCanAddBot(true);
    }

    return () => {
      socket.off('game:started', handleGameStarted);
      socket.off('player:joined', handlePlayerJoined);
      socket.off('player:left', handlePlayerLeft);
    };
  }, [socket, isHost, createdRoomId, isJoined]);

  // Navigate to game when a second player joins (for non-bot games) - but not for the host
  useEffect(() => {
    if (createdRoomId && isJoined && !isHost) {
      router.push(`/game/${createdRoomId}`);
    }
  }, [createdRoomId, isJoined, isHost, router]);

  // For bot games, navigate immediately
  useEffect(() => {
    if (createdRoomId && mode === 'bot') {
      router.push(`/game/${createdRoomId}`);
    }
  }, [createdRoomId, mode, router]);

  // Auto-create room when name is provided from landing page (only if no room in URL)
  // OR rejoin existing room when room ID is in URL
  useEffect(() => {
    if (!socket || !playerName.trim()) return;
    
    // Skip if we already have a room (either created or joined)
    if (createdRoomId) return;
    
    if (roomFromUrl) {
      // Rejoin existing room when room ID is in URL
      socket.emit('rejoin-room', { roomId: roomFromUrl });
    } else if (mode === 'online') {
      handleCreateRoom();
    }
  }, [socket, playerName, mode, createdRoomId, roomFromUrl]);

  const handleCreateRoom = () => {
    if (!socket || !playerName.trim()) return;
    setError(null);
    socket.emit('create-room', {
      hostName: playerName.trim(),
      isBotMode: mode === 'bot',
    });
  };

  const handleJoinRoom = () => {
    if (!socket || !playerName.trim() || roomCode.trim().length !== 6) return;
    setError(null);
    socket.emit('join-room', {
      roomId: roomCode.trim().toUpperCase(),
      playerName: playerName.trim(),
    });
  };

  const handleLeaveRoom = () => {
    if (!socket) return;
    socket.emit('leave-room');
    clearRoom();
    setCreatedRoomId(null);
    setIsJoined(false);
    setIsHost(false);
    setCanAddBot(false);
    setCanStartGame(false);
    router.push('/');
  };

  const handleAddBot = () => {
    if (!socket || !createdRoomId) return;
    socket.emit('add-bot', { roomId: createdRoomId });
    setCanAddBot(false);
  };

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit('start-game');
    setCanStartGame(false);
  };

  // Listen for player joined/left to update host controls
  useEffect(() => {
    if (!socket || !isHost) return;

    const handlePlayerJoined = () => {
      setCanStartGame(true);
      setCanAddBot(false);
    };

    const handlePlayerLeft = () => {
      setCanStartGame(false);
      setCanAddBot(true);
    };

    socket.on('player:joined', handlePlayerJoined);
    socket.on('player:left', handlePlayerLeft);

    return () => {
      socket.off('player:joined', handlePlayerJoined);
      socket.off('player:left', handlePlayerLeft);
    };
  }, [socket, isHost]);

  // If in a room, show waiting state
  if (createdRoomId) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#1a2e1a]">
        <div className="bg-[#2d4a2d] rounded-xl p-8 max-w-md w-full text-center">
          {/* Room Code */}
          <div className="mb-6">
            <p className="text-gray-400 text-sm mb-2">Room Code</p>
            <p className="text-4xl font-mono font-bold tracking-widest text-[#d4a847]">
              {createdRoomId}
            </p>
          </div>

          {/* Waiting message */}
          {mode === 'bot' ? (
            <>
              <div className="mb-4">
                <span className="inline-block bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm">
                  vs Bot
                </span>
              </div>
              <p className="text-gray-400">Setting up bot game...</p>
            </>
          ) : !isJoined ? (
            <>
              <p className="text-gray-300 text-lg mb-2">Waiting for opponent&hellip;</p>
              <p className="text-gray-500 text-sm mb-4">Share the room code with a friend</p>
              
              {/* Host Controls - Add Bot */}
              {isHost && canAddBot && (
                <button
                  onClick={handleAddBot}
                  className="mb-4 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg text-sm"
                >
                  + Add Bot
                </button>
              )}
            </>
          ) : players.length >= 2 ? (
            <>
              <p className="text-gray-300 text-lg mb-4">Room is full!</p>
              {isHost && (
                <button
                  onClick={handleStartGame}
                  className="mb-4 px-6 py-3 bg-[#d4a847] hover:bg-[#c49a3d] text-[#1a2e1a] font-bold rounded-lg"
                >
                  Start Game
                </button>
              )}
            </>
          ) : (
            <p className="text-gray-300 text-lg">Starting game...</p>
          )}

          {/* Leave button with confirmation */}
          {!showLeaveConfirm ? (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="mt-6 px-6 py-3 bg-red-600/80 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
            >
              Leave Room
            </button>
          ) : (
            <div className="mt-6 p-4 bg-red-900/30 border border-red-600/50 rounded-lg">
              <p className="text-red-300 text-sm mb-3">
                Leave Room: You&apos;ll need the room code to rejoin. Are you sure?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleLeaveRoom}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Yes, Leave
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#1a2e1a]">
      <div className="bg-[#2d4a2d] rounded-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-8">
          {mode === 'bot' ? 'Bot Game' : 'Join Game'}
        </h1>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Name input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 bg-[#1a2e1a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d4a847]"
            maxLength={20}
          />
        </div>

        {/* Create Room Section */}
        <div className="mb-6">
          <button
            onClick={handleCreateRoom}
            disabled={!playerName.trim()}
            className="w-full py-4 bg-[#d4a847] hover:bg-[#c49a3d] disabled:bg-gray-700 disabled:text-gray-500 text-[#1a2e1a] font-bold rounded-lg transition-colors"
          >
            Create Room
          </button>
        </div>

        {/* Divider for online mode */}
        {mode === 'online' && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-gray-600" />
              <span className="text-gray-500 text-sm">or</span>
              <div className="flex-1 h-px bg-gray-600" />
            </div>

            {/* Join Room Section */}
            <div>
              <div className="mb-4">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-[#1a2e1a] border border-gray-600 rounded-lg text-white uppercase tracking-widest text-center font-mono placeholder-gray-600 focus:outline-none focus:border-[#d4a847]"
                />
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || roomCode.length !== 6}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-colors"
              >
                Join Room
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-[#1a2e1a]">
        <p className="text-gray-400">Loading...</p>
      </main>
    }>
      <LobbyContent />
    </Suspense>
  );
}
