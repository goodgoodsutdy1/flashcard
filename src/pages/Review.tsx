import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { loadData, updateCard, addReviewLog, getDueCards } from '../data/storage';
import { sm2Next } from '../data/sm2';
import { FlashCard } from '../components/FlashCard';
import { RatingBar } from '../components/RatingBar';
import { TTSButton } from '../components/TTSButton';
import type { Card, Deck } from '../types';

export function Review() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [queue, setQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [ratingDisabled, setRatingDisabled] = useState(false);

  useEffect(() => {
    const data = loadData();
    const d = data.decks.find(dk => dk.id === deckId) ?? null;
    setDeck(d);
    if (deckId) {
      const due = getDueCards(deckId);
      // Shuffle
      const shuffled = [...due].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      if (shuffled.length === 0) setDone(true);
    }
  }, [deckId]);

  const currentCard = queue[currentIndex];

  const handleRate = useCallback((quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (!currentCard || ratingDisabled) return;
    setRatingDisabled(true);

    const result = sm2Next(currentCard, quality);
    updateCard(currentCard.id, {
      ...result,
      lastReviewed: new Date().toISOString(),
    });
    addReviewLog({ cardId: currentCard.id, deckId: currentCard.deckId, quality });

    setReviewed(r => r + 1);

    setTimeout(() => {
      if (currentIndex + 1 >= queue.length) {
        setDone(true);
      } else {
        setCurrentIndex(i => i + 1);
        setFlipped(false);
        setRatingDisabled(false);
      }
    }, 300);
  }, [currentCard, currentIndex, queue.length, ratingDisabled]);

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="text-6xl">🎉</div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">本轮完成！</h2>
            <p className="text-gray-500 mt-2">本次复习了 {reviewed} 张卡片。</p>
          </div>
          <div className="space-y-2">
            {deckId && (
              <Link
                to={`/review/${deckId}`}
                onClick={() => {
                  setDone(false);
                  setReviewed(0);
                  setCurrentIndex(0);
                  setFlipped(false);
                  const due = getDueCards(deckId);
                  setQueue([...due].sort(() => Math.random() - 0.5));
                  if (due.length === 0) setDone(true);
                }}
                className="block w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
              >
                再复习一遍
              </Link>
            )}
            <Link to="/" className="block w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">加载中...</p>
      </div>
    );
  }

  const progress = queue.length > 0 ? ((currentIndex) / queue.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">{deck?.name}</p>
            <p className="text-xs text-gray-400">{currentIndex + 1} / {queue.length}</p>
          </div>
          <Link to="/stats" className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </Link>
        </div>
        {/* Progress bar */}
        <div className="max-w-lg mx-auto mt-2">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* TTS button above card */}
        <div className="flex justify-center">
          <TTSButton text={currentCard.audioText} className="w-12 h-12" />
        </div>

        {/* Card */}
        <FlashCard
          key={currentCard.id}
          card={currentCard}
          onFlip={() => setFlipped(true)}
        />

        {/* Rating */}
        <div className={`transition-opacity duration-300 ${flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <RatingBar onRate={handleRate} disabled={ratingDisabled} />
        </div>

        {!flipped && (
          <p className="text-center text-sm text-gray-400">点击卡片查看答案</p>
        )}
      </main>
    </div>
  );
}
