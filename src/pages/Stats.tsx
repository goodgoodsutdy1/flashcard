import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { loadData } from '../data/storage';

export function Stats() {
  const stats = useMemo(() => {
    const data = loadData();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const reviewsToday = data.reviewLogs.filter(
      l => new Date(l.reviewedAt) >= todayStart
    );

    const reviewsByDay: Record<string, number> = {};
    data.reviewLogs.forEach(l => {
      const day = l.reviewedAt.slice(0, 10);
      reviewsByDay[day] = (reviewsByDay[day] ?? 0) + 1;
    });

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      return { key, label: d.toLocaleDateString('en', { weekday: 'short' }), count: reviewsByDay[key] ?? 0 };
    });

    const totalCards = data.cards.length;
    const dueCards = data.cards.filter(c => new Date(c.dueDate) <= today).length;
    const masteredCards = data.cards.filter(c => c.easeFactor >= 2.5 && c.repetitions >= 3).length;

    const avgQuality = data.reviewLogs.length
      ? (data.reviewLogs.reduce((s, l) => s + l.quality, 0) / data.reviewLogs.length).toFixed(1)
      : '—';

    const deckStats = data.decks.map(deck => {
      const deckCards = data.cards.filter(c => c.deckId === deck.id);
      const deckLogs = data.reviewLogs.filter(l => l.deckId === deck.id);
      const deckDue = deckCards.filter(c => new Date(c.dueDate) <= today).length;
      return {
        deck,
        total: deckCards.length,
        due: deckDue,
        reviews: deckLogs.length,
      };
    });

    return {
      totalCards,
      dueCards,
      masteredCards,
      avgQuality,
      reviewsToday: reviewsToday.length,
      totalReviews: data.reviewLogs.length,
      last7Days,
      deckStats,
      maxDay: Math.max(...last7Days.map(d => d.count), 1),
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-semibold text-gray-800">学习统计</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Overview cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '总卡片数', value: stats.totalCards, color: 'text-gray-800' },
            { label: '今日待复习', value: stats.dueCards, color: 'text-orange-600' },
            { label: '已掌握', value: stats.masteredCards, color: 'text-green-600' },
            { label: '今日已复习', value: stats.reviewsToday, color: 'text-indigo-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* 7-day activity chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">最近 7 天</h2>
          <div className="flex items-end gap-2 h-24">
            {stats.last7Days.map(day => (
              <div key={day.key} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
                  <div
                    className="w-full rounded-t-md bg-indigo-500 transition-all"
                    style={{ height: `${(day.count / stats.maxDay) * 72}px`, minHeight: day.count > 0 ? '4px' : '0' }}
                  />
                </div>
                <p className="text-xs text-gray-400">{day.label}</p>
                {day.count > 0 && <p className="text-xs font-semibold text-indigo-600">{day.count}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">总览</h2>
          {[
            { label: '累计复习次数', value: stats.totalReviews },
            { label: '平均质量评分', value: stats.avgQuality },
          ].map(s => (
            <div key={s.label} className="flex justify-between text-sm">
              <span className="text-gray-500">{s.label}</span>
              <span className="font-semibold text-gray-800">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Per-deck stats */}
        {stats.deckStats.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">各卡组</h2>
            <div className="space-y-3">
              {stats.deckStats.map(({ deck, total, due, reviews }) => (
                <div key={deck.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{deck.name}</p>
                    <p className="text-xs text-gray-400">{total} 张 · 已复习 {reviews} 次</p>
                  </div>
                  {due > 0 && (
                    <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{due} 待复习</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
