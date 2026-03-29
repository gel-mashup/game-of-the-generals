'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/components/SocketProvider';
import { useRoomStore } from '@/store/roomStore';

export default function LandingPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const { rooms, setRooms } = useRoomStore();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch rooms on mount and poll periodically
  useEffect(() => {
    if (!socket) return;

    socket.emit('get-rooms');

    const handleRoomsList = (roomList: any[]) => {
      setRooms(roomList);
    };

    socket.on('rooms:list', handleRoomsList);

    const interval = setInterval(() => {
      socket.emit('get-rooms');
    }, 5000);

    return () => {
      socket.off('rooms:list', handleRoomsList);
      clearInterval(interval);
    };
  }, [socket, setRooms]);

  const handleJoinRoom = (roomId: string) => {
    if (!socket || !playerName.trim()) {
      setError('Please enter your name first');
      return;
    }
    if (!socket.connected) {
      socket.on('connect', () => {
        performJoinRoom(roomId);
      });
      return;
    }
    performJoinRoom(roomId);
  };

  const performJoinRoom = (roomId: string) => {
    if (!socket) {
      return;
    }
    setError(null);

    const handleRoomJoined = ({ roomId: joinedRoomId }: { roomId: string }) => {
      router.push(`/game/${joinedRoomId}?name=${encodeURIComponent(playerName.trim())}`);
    };

    const handleError = ({ message }: { message: string }) => {
      setError(message);
      socket.off('room:joined', handleRoomJoined);
      socket.off('error', handleError);
    };

    socket.on('room:joined', handleRoomJoined);
    socket.on('error', handleError);

    socket.emit('join-room-by-id', {
      roomId,
      playerName: playerName.trim(),
    });
  };

  const performCreateRoom = () => {
    if (!socket) return;
    setError(null);
    const handleRoomCreated = ({ roomId }: { roomId: string }) => {
      router.push(`/game/${roomId}?name=${encodeURIComponent(playerName.trim())}`);
    };

    const handleError = ({ message }: { message: string }) => {
      setError(message);
      socket.off('room:created', handleRoomCreated);
      socket.off('error', handleError);
    };

    socket.on('room:created', handleRoomCreated);
    socket.on('error', handleError);

    socket.emit('create-room', {
      hostName: playerName.trim(),
      isBotMode: false,
    });
  };

  const waitingRooms = rooms.filter(r => r.status === 'waiting');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#1a2e1a]">
      <h1 className="text-4xl md:text-5xl font-bold text-[#d4a847] mb-4 text-center">
        Game of the Generals
      </h1>
      <p className="text-gray-400 text-center text-lg mb-8 max-w-md">
        The classic Filipino strategy game, online
      </p>

      {/* Name input */}
      <div className="mb-6 w-full max-w-sm">
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-3 bg-[#2d4a2d] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d4a847]"
          maxLength={20}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-300 text-sm max-w-sm w-full">
          {error}
        </div>
      )}

      {/* Create Room Button */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => {
            if (!socket || !playerName.trim()) {
              setError('Please enter your name first');
              return;
            }
            if (!socket.connected) {
              setError('Connecting...');
              socket.on('connect', () => {
                performCreateRoom();
              });
              return;
            }
            performCreateRoom();
          }}
          className="px-8 py-3 bg-[#d4a847] hover:bg-[#c49a3d] text-[#1a2e1a] font-semibold rounded-lg text-lg"
        >
          + Create Room
        </button>
      </div>

      {/* Room List */}
      <div className="bg-[#2d4a2d] rounded-xl p-6 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Open Rooms</h2>
        
        {waitingRooms.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No open rooms. Create one to start!</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {waitingRooms.map((room) => (
              <div
                key={room.roomId}
                className="bg-[#1a2e1a] rounded-lg p-4 border border-gray-700 hover:border-gray-500 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-sm">
                      {room.hostName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold truncate">{room.hostName}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    room.isBotGame 
                      ? 'bg-green-600/20 text-green-400' 
                      : 'bg-yellow-600/20 text-yellow-400'
                  }`}>
                    {room.isBotGame ? 'vs Bot' : 'PVP'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 font-mono">{room.roomId}</span>
                  <span className="text-gray-400 text-sm">{room.playerCount}/2</span>
                </div>
                <button
                  onClick={() => handleJoinRoom(room.roomId)}
                  disabled={room.isFull}
                  className={`w-full mt-3 py-2 rounded text-sm font-medium ${
                    room.isFull
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {room.isFull ? 'Full' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
