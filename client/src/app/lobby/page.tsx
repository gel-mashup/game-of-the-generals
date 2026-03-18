'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '@/components/SocketProvider';
import { useRoomStore } from '@/store/roomStore';

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket } = useSocket();
  const { setRoom, addPlayer, removePlayer, clearRoom } = useRoomStore();

  const mode = searchParams.get('mode') || 'online';

  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
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
    };

    const handleRoomJoined = ({
      roomId,
      playerId,
      playerSide,
    }: {
      roomId: string;
      playerId: string;
      playerSide: 'red' | 'blue';
    }) => {
      setRoom(roomId, playerId, playerSide, false, false);
      setCreatedRoomId(roomId);
      setIsJoined(true);
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

    socket.on('room:created', handleRoomCreated);
    socket.on('room:joined', handleRoomJoined);
    socket.on('player:joined', handlePlayerJoined);
    socket.on('player:left', handlePlayerLeft);
    socket.on('error', handleError);

    return () => {
      socket.off('room:created', handleRoomCreated);
      socket.off('room:joined', handleRoomJoined);
      socket.off('player:joined', handlePlayerJoined);
      socket.off('player:left', handlePlayerLeft);
      socket.off('error', handleError);
    socket.off('player:left', handlePlayerLeft);
    };
  }, [socket, setRoom, addPlayer, removePlayer, clearRoom]);

  // Navigate to game when both players present (for non-bot games)
  useEffect(() => {
    if (createdRoomId && isJoined) {
      router.push(`/game/${createdRoomId}`);
    }
  }, [createdRoomId, isJoined, router]);

  // For bot games, navigate immediately
  useEffect(() => {
    if (createdRoomId && mode === 'bot') {
      router.push(`/game/${createdRoomId}`);
    }
  }, [createdRoomId, mode, router]);

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
    router.push('/');
  };

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
              <p className="text-gray-500 text-sm mb-6">Share the room code with a friend</p>
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
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-colors"
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
