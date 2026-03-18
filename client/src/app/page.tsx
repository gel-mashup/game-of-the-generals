'use client';

import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#1a2e1a]">
      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-[#d4a847] mb-4 text-center">
        Game of the Generals
      </h1>

      {/* Subtitle */}
      <p className="text-gray-400 text-center text-lg mb-12 max-w-md">
        The classic Filipino strategy game, online
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button
          onClick={() => router.push('/lobby?mode=bot')}
          className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors text-lg"
        >
          Play vs Bot
        </button>

        <button
          onClick={() => router.push('/lobby?mode=online')}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-lg"
        >
          Play Online
        </button>
      </div>
    </main>
  );
}
