import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadData, createCard, updateCard, deleteCard, updateDeck } from '../data/storage';
import type { Deck, Card } from '../types';

type CardForm = {
  front: string;
  back: string;
  phonetic: string;
  example: string;
  audioText: string;
};

const emptyForm: CardForm = { front: '', back: '', phonetic: '', example: '', audioText: '' };

export function ManageDeck() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState<Card | null>(null);
  const [form, setForm] = useState<CardForm>(emptyForm);
  const [editDeckName, setEditDeckName] = useState(false);
  const [deckNameForm, setDeckNameForm] = useState('');

  const refresh = () => {
    if (!deckId) return;
    const data = loadData();
    const d = data.decks.find(dk => dk.id === deckId) ?? null;
    setDeck(d);
    setCards(data.cards.filter(c => c.deckId === deckId));
  };

  useEffect(() => {
    refresh();
  }, [deckId]);

  const handleSubmitCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckId || !form.front.trim() || !form.back.trim()) return;

    if (editCard) {
      updateCard(editCard.id, {
        front: form.front.trim(),
        back: form.back.trim(),
        phonetic: form.phonetic.trim() || undefined,
        example: form.example.trim() || undefined,
        audioText: form.audioText.trim() || form.front.trim(),
      });
    } else {
      createCard({
        deckId,
        front: form.front.trim(),
        back: form.back.trim(),
        phonetic: form.phonetic.trim() || undefined,
        example: form.example.trim() || undefined,
        audioText: form.audioText.trim() || form.front.trim(),
      });
    }

    setForm(emptyForm);
    setEditCard(null);
    setShowForm(false);
    refresh();
  };

  const handleEdit = (card: Card) => {
    setEditCard(card);
    setForm({
      front: card.front,
      back: card.back,
      phonetic: card.phonetic ?? '',
      example: card.example ?? '',
      audioText: card.audioText,
    });
    setShowForm(true);
  };

  const handleDelete = (card: Card) => {
    if (!confirm(`Delete card "${card.front}"?`)) return;
    deleteCard(card.id);
    refresh();
  };

  const handleSaveDeckName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckId || !deckNameForm.trim()) return;
    updateDeck(deckId, { name: deckNameForm.trim() });
    setEditDeckName(false);
    refresh();
  };

  if (!deck) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-400">加载中...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {editDeckName ? (
            <form onSubmit={handleSaveDeckName} className="flex-1 flex gap-2">
              <input
                autoFocus
                value={deckNameForm}
                onChange={e => setDeckNameForm(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button type="submit" className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg">保存</button>
              <button type="button" onClick={() => setEditDeckName(false)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-lg">取消</button>
            </form>
          ) : (
            <button
              className="flex-1 text-left font-semibold text-gray-800 truncate"
              onClick={() => { setDeckNameForm(deck.name); setEditDeckName(true); }}
            >
              {deck.name}
              <span className="ml-1 text-gray-300 text-sm">✎</span>
            </button>
          )}
          <span className="text-sm text-gray-400">{cards.length} cards</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Card form */}
        {showForm && (
          <form onSubmit={handleSubmitCard} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">{editCard ? '编辑卡片' : '新建卡片'}</h3>
            <div className="space-y-2">
              <input required type="text" placeholder="正面（单词/符号）" value={form.front}
                onChange={e => setForm(p => ({ ...p, front: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <textarea required placeholder="背面（释义）" value={form.back}
                onChange={e => setForm(p => ({ ...p, back: e.target.value }))}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
              <input type="text" placeholder="音标（可选，如 /wɜːrd/）" value={form.phonetic}
                onChange={e => setForm(p => ({ ...p, phonetic: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input type="text" placeholder="例句（可选）" value={form.example}
                onChange={e => setForm(p => ({ ...p, example: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input type="text" placeholder="朗读文本（默认同正面）" value={form.audioText}
                onChange={e => setForm(p => ({ ...p, audioText: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                {editCard ? '保存修改' : '添加卡片'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditCard(null); setForm(emptyForm); }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600">
                取消
              </button>
            </div>
          </form>
        )}

        {/* Cards list */}
        {cards.map(card => {
          const today = new Date(); today.setHours(23, 59, 59, 999);
          const isDue = new Date(card.dueDate) <= today;
          const dueDate = new Date(card.dueDate).toLocaleDateString();
          return (
            <div key={card.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{card.front}</p>
                  <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{card.back}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDue ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                      {isDue ? '待复习' : `${dueDate} 复习`}
                    </span>
                    <span className="text-xs text-gray-400">已复习 {card.repetitions} 次</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleEdit(card)}
                    className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-500 transition-colors text-sm">
                    ✎
                  </button>
                  <button onClick={() => handleDelete(card)}
                    className="p-2 rounded-lg bg-gray-50 text-red-300 hover:bg-red-50 hover:text-red-500 transition-colors text-sm">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditCard(null); setForm(emptyForm); }}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium hover:border-indigo-300 hover:text-indigo-500 transition-colors"
          >
            + 添加卡片
          </button>
        )}

        {cards.length === 0 && !showForm && (
          <p className="text-center text-gray-400 text-sm py-8">还没有卡片，添加第一张吧！</p>
        )}
      </main>
    </div>
  );
}
