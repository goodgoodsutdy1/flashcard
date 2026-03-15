import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadData, createDeck, deleteDeck, createCard } from '../data/storage';
import { PRESET_DECKS, PRESET_CATEGORIES } from '../data/presets';
import type { Deck } from '../types';

const CARD_TYPE_LABELS: Record<Deck['cardType'], string> = {
  vowel: '🔤 Vowels',
  consonant: '🔊 Consonants',
  word: '📖 Words',
  custom: '✏️ Custom',
};

export function Home() {
  const [data, setData] = useState(() => loadData());
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', cardType: 'custom' as Deck['cardType'] });

  useEffect(() => {
    setData(loadData());
  }, []);

  const refresh = () => setData(loadData());

  const handleCreateDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createDeck({ name: form.name.trim(), description: form.description.trim(), cardType: form.cardType });
    setForm({ name: '', description: '', cardType: 'custom' });
    setShowNewDeck(false);
    refresh();
  };

  const handleLoadPreset = (preset: typeof PRESET_DECKS[0]) => {
    const deck = createDeck(preset.deck);
    preset.cards.forEach(card => {
      createCard({ ...card, deckId: deck.id });
    });
    refresh();
  };

  const handleDeleteDeck = (id: string, name: string) => {
    if (!confirm(`Delete deck "${name}" and all its cards?`)) return;
    deleteDeck(id);
    refresh();
  };

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const getDueCount = (deckId: string) =>
    data.cards.filter(c => c.deckId === deckId && new Date(c.dueDate) <= today).length;

  const getCardCount = (deckId: string) =>
    data.cards.filter(c => c.deckId === deckId).length;

  const loadedPresetNames = new Set(data.decks.map(d => d.name));

  const availableByCategory = PRESET_CATEGORIES.map(cat => ({
    cat,
    presets: PRESET_DECKS.filter(p => p.category === cat && !loadedPresetNames.has(p.deck.name)),
  })).filter(g => g.presets.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 微信内置浏览器提示 */}
      {/MicroMessenger/i.test(navigator.userAgent) && (
        <div className="bg-amber-400 text-amber-900 text-sm px-4 py-2.5 text-center font-medium">
          朗读功能在微信中不可用 · 请点右上角 ··· → 在浏览器中打开
        </div>
      )}
      {/* Header */}
      <header className="bg-indigo-600 text-white px-4 pt-safe-top pb-4">
        <div className="max-w-lg mx-auto flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold">闪卡</h1>
            <p className="text-indigo-200 text-sm mt-0.5">我的卡组</p>
          </div>
          {data.reviewLogs.length > 0 && (
            <Link to="/stats" className="text-indigo-200 hover:text-white text-sm">
              统计 →
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Preset decks by category */}
        {availableByCategory.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">快速开始</h2>
            {availableByCategory.map(({ cat, presets }) => (
              <div key={cat}>
                <p className="text-xs font-medium text-gray-400 mb-2 pl-1">{cat}</p>
                <div className="space-y-2">
                  {presets.map(preset => (
                    <button
                      key={preset.deck.name}
                      onClick={() => handleLoadPreset(preset)}
                      className="w-full flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-indigo-100 hover:border-indigo-300 transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-semibold text-gray-800">{preset.deck.name}</p>
                        <p className="text-sm text-gray-500">{preset.cards.length} 张 · {CARD_TYPE_LABELS[preset.deck.cardType]}</p>
                      </div>
                      <span className="text-indigo-500 text-sm font-medium flex-shrink-0 ml-3">+ 添加</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* My decks */}
        {data.decks.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">我的卡组</h2>
            <div className="space-y-2">
              {data.decks.map(deck => {
                const total = getCardCount(deck.id);
                const due = getDueCount(deck.id);
                return (
                  <div key={deck.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{deck.name}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{CARD_TYPE_LABELS[deck.cardType]} · {total} 张</p>
                          {deck.description && (
                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{deck.description}</p>
                          )}
                        </div>
                        {due > 0 && (
                          <span className="ml-3 flex-shrink-0 bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            {due} due
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Link
                          to={`/review/${deck.id}`}
                          className={`flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors ${
                            due > 0
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                              : 'bg-gray-100 text-gray-400 pointer-events-none'
                          }`}
                        >
                          {due > 0 ? `复习 ${due}` : '今日已完成 ✓'}
                        </Link>
                        <Link
                          to={`/deck/${deck.id}`}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          管理
                        </Link>
                        <button
                          onClick={() => handleDeleteDeck(deck.id, deck.name)}
                          className="px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                          aria-label="删除卡组"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* New deck form */}
        {showNewDeck ? (
          <form onSubmit={handleCreateDeck} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">新建卡组</h3>
            <input
              autoFocus
              required
              type="text"
              placeholder="卡组名称"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="text"
              placeholder="描述（可选）"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <select
              value={form.cardType}
              onChange={e => setForm(p => ({ ...p, cardType: e.target.value as Deck['cardType'] }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="custom">自定义</option>
              <option value="word">词汇</option>
              <option value="vowel">元音</option>
              <option value="consonant">辅音</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                创建
              </button>
              <button type="button" onClick={() => setShowNewDeck(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600">
                取消
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowNewDeck(true)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium hover:border-indigo-300 hover:text-indigo-500 transition-colors"
          >
            + 新建卡组
          </button>
        )}
      </main>
    </div>
  );
}
