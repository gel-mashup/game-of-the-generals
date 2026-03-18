'use client';

import { useParams } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import { useSocket } from '@/components/SocketProvider';
import { useEffect } from 'react';

export default function GamePage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { gameStatus } = useGameStore();
  const { players, isBotGame } = useRoomStore();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handlePlayerLeft = ({ playerId }: { playerId: string; reason: string }) => {
      console.log('Player left:', playerId);
    };

    socket.on('player:left', handlePlayerLeft);

    return () => {
      socket.off('player:left', handlePlayerLeft);
    };
  }, [socket]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#1a2e1a]">
      {/* Game Header */}
      <div className="w-full max-w-3xl mb-4 bg-[#2d4a2d] rounded-lg p-4 flex items-center justify-between">
        {/* Room Code */}
        <div>
          <p className="text-gray-400 text-xs">Room</p>
          <p className="font-mono font-bold text-[#d4a847]">{roomId}</p>
        </div>

        {/* Players */}
        <div className="flex items-center gap-4">
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
        <div>
          <p className="text-gray-400 text-xs">Status</p>
          <p className="font-medium capitalize">{gameStatus}</p>
        </div>
      </div>

      {/* Game Board Placeholder */}
      <div className="bg-[#2d4a2d] rounded-xl p-12 text-center">
        <p className="text-2xl font-bold text-gray-300 mb-2">Game Board</p>
        <p className="text-gray-500">Board component coming in Plan 02</p>
        <div className="mt-6 text-sm text-gray-600">
          <p>Room: {roomId}</p>
          <p>Players: {players.length}</p>
        </div>
      </div>
    </main>
  );
}
