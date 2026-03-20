'use client';

import React, { useEffect, useState } from 'react';
import type { Piece, Position } from '@/types';
import type { BattleOutcome, BattleOutcomeResult } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';

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

type Phase = 'sliding' | 'revealed' | 'result' | 'done';

interface BattleRevealProps {
  attacker: Piece;
  defender: Piece;
  attackerPosition: Position;
  defenderPosition: Position;
  outcome: BattleOutcome;
  onComplete: () => void;
}

export default function BattleReveal({
  attacker,
  defender,
  attackerPosition,
  defenderPosition,
  outcome,
  onComplete,
}: BattleRevealProps) {
  const [phase, setPhase] = useState<Phase>('sliding');

  useEffect(() => {
    // Phase 1: sliding (500ms)
    const t1 = setTimeout(() => setPhase('revealed'), 500);
    // Phase 2: revealed (500ms more, total ~1s)
    const t2 = setTimeout(() => setPhase('result'), 1000);
    // Phase 3: result animation (600ms)
    const t3 = setTimeout(() => {
      setPhase('done');
      setTimeout(onComplete, 100);
    }, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  const { playerSide } = useRoomStore();
  const attackerSymbol = attacker.owner !== playerSide
    ? '?'
    : (PIECE_SYMBOLS[attacker.type] ?? attacker.type[0].toUpperCase());
  const defenderSymbol = defender.owner !== playerSide
    ? '?'
    : (PIECE_SYMBOLS[defender.type] ?? defender.type[0].toUpperCase());

  const getResultText = (result: BattleOutcomeResult) => {
    if (result === 'attacker_wins') return 'Attacker Wins!';
    if (result === 'defender_wins') return 'Defender Wins!';
    return 'TIE — Both Destroyed!';
  };

  const showAttacker = outcome.result !== 'defender_wins';
  const showDefender = outcome.result !== 'attacker_wins';
  const showExplosion = outcome.result === 'tie';
  const battleLabel = `${attacker.owner !== playerSide ? '?' : attacker.type} vs ${defender.owner !== playerSide ? '?' : defender.type}`;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
      <div className="relative flex flex-col items-center gap-4">
        {/* Battle label */}
        <div className="text-center">
          <p className="text-2xl font-bold text-white mb-1">BATTLE!</p>
          <p className="text-sm text-gray-300">
            {battleLabel}
          </p>
        </div>

        {/* Pieces container */}
        <div className="relative w-48 h-20 flex items-center justify-center gap-6">
          {/* Attacker */}
          <div
            className={`
              w-16 h-16 rounded-full flex items-center justify-center shadow-xl
              transition-all duration-500
              ${phase === 'sliding' ? '-translate-x-6' : ''}
              ${phase === 'done' && !showAttacker ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}
              ${attacker.owner === 'red' ? 'bg-red-600' : 'bg-blue-600'}
            `}
          >
            <span className="text-white text-sm font-bold">{attackerSymbol}</span>
          </div>

          {/* VS */}
          <div className="text-2xl font-bold text-gray-400">⚔</div>

          {/* Defender */}
          <div
            className={`
              w-16 h-16 rounded-full flex items-center justify-center shadow-xl
              transition-all duration-500
              ${phase === 'sliding' ? 'translate-x-6' : ''}
              ${phase === 'done' && !showDefender ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}
              ${defender.owner === 'red' ? 'bg-red-600' : 'bg-blue-600'}
            `}
          >
            <span className="text-white text-sm font-bold">{defenderSymbol}</span>
          </div>

          {/* Explosion effect for tie */}
          {showExplosion && phase === 'result' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-32 h-32 rounded-full explosion-burst" />
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-orange-400 spark"
                  style={{
                    transform: `rotate(${i * 45}deg) translateY(-20px)`,
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Result text */}
        {phase === 'result' || phase === 'done' ? (
          <p
            className={`
              text-lg font-bold text-center
              ${outcome.result === 'attacker_wins' ? 'text-green-400' : ''}
              ${outcome.result === 'defender_wins' ? 'text-red-400' : ''}
              ${outcome.result === 'tie' ? 'text-orange-400' : ''}
            `}
          >
            {getResultText(outcome.result)}
          </p>
        ) : (
          <p className="text-lg font-bold text-gray-400 animate-pulse">Revealing…</p>
        )}
      </div>

      <style>{`
        @keyframes explosionBurst {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .explosion-burst {
          animation: explosionBurst 0.6s ease-out forwards;
          background: radial-gradient(circle, rgba(255,100,50,0.8) 0%, transparent 70%);
        }
        @keyframes sparkFly {
          0% { transform: rotate(var(--angle)) translateY(0); opacity: 1; }
          100% { transform: rotate(var(--angle)) translateY(-60px); opacity: 0; }
        }
        .spark {
          animation: sparkFly 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
