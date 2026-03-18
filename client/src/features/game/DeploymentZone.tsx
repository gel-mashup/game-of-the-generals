'use client';

import React from 'react';

interface DeploymentZoneProps {
  side: 'red' | 'blue';
  isVisible: boolean;
}

export default function DeploymentZone({ side, isVisible }: DeploymentZoneProps) {
  if (!isVisible) return null;

  const isRed = side === 'red';

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Zone highlight overlay */}
      <div
        className={`
          absolute left-0 right-0
          ${isRed ? 'top-0 h-3/8' : 'bottom-0 h-3/8'}
          ${isRed ? 'bg-[rgba(192,57,43,0.15)]' : 'bg-[rgba(41,128,185,0.15)]'}
          ${isRed ? 'border-b-2 border-b-red-500/30' : 'border-t-2 border-t-blue-500/30'}
        `}
      />

      {/* Dashed border indicator */}
      <div
        className={`
          absolute left-0 right-0
          ${isRed ? 'top-[37.5%]' : 'bottom-[37.5%]'}
          h-0
          ${isRed ? 'border-t-2 border-dashed border-red-500/30' : 'border-t-2 border-dashed border-blue-500/30'}
        `}
      />
    </div>
  );
}
