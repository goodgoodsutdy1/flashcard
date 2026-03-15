import { useState } from 'react';
import type { Card } from '../types';

interface FlashCardProps {
  card: Card;
  onFlip?: () => void;
}

export function FlashCard({ card, onFlip }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    setFlipped(prev => !prev);
    onFlip?.();
  };

  return (
    <div
      className="w-full cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={handleFlip}
    >
      <div
        className="relative w-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          minHeight: '280px',
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center p-8 border border-gray-100"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-4">点击翻转</p>
          <p className="text-4xl font-bold text-gray-800 text-center leading-tight">{card.front}</p>
          {card.phonetic && (
            <p className="mt-4 text-xl text-gray-400 font-mono">{card.phonetic}</p>
          )}
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 bg-indigo-600 rounded-2xl shadow-lg flex flex-col items-center justify-center p-8"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <p className="text-xs font-medium text-indigo-300 uppercase tracking-widest mb-4">释义</p>
          {(() => {
            const lines = card.back.split('\n').filter(Boolean);
            return lines.length > 1 ? (
              <>
                <p className="text-2xl font-bold text-white text-center leading-snug">{lines[0]}</p>
                <p className="mt-3 text-sm text-indigo-200 text-center leading-relaxed">{lines.slice(1).join(' ')}</p>
              </>
            ) : (
              <p className="text-2xl font-semibold text-white text-center leading-snug">{card.back}</p>
            );
          })()}
          {card.example && (
            <p className="mt-5 text-sm text-indigo-200 text-center italic">"{card.example}"</p>
          )}
        </div>
      </div>
    </div>
  );
}
