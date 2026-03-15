import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadData, createDeck, deleteDeck, createCard } from '../data/storage';
import { PRESET_DECKS } from '../data/presets';
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white px-4 pt-safe-top pb-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mt-4">Flashcard</h1>
          <p className="text-indigo-200 text-sm mt-1">Your decks</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Preset decks section */}
        {PRESET_DECKS.some(p => !loadedPresetNames.has(p.deck.name)) && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Get Started</h2>
            <div className="space-y-2">
              {PRESET_DECKS.filter(p => !loadedPresetNames.has(p.deck.name)).map(preset => (
                <button
                  key={preset.deck.name}
                  onClick={() => handleLoadPreset(preset)}
                  className="w-full flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-indigo-100 hover:border-indigo-300 transition-colors"
                >
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">{preset.deck.name}</p>
                    <p className="text-sm text-gray-500">{preset.cards.length} cards · {CARD_TYPE_LABELS[preset.deck.cardType]}</p>
                  </div>
                  <span className="text-indigo-500 text-sm font-medium">Add →</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* My decks */}
        {data.decks.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">My Decks</h2>
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
                          <p className="text-sm text-gray-500 mt-0.5">{CARD_TYPE_LABELS[deck.cardType]} · {total} cards</p>
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
                          {due > 0 ? `Review ${due}` : 'All done ✓'}
                        </Link>
                        <Link
                          to={`/deck/${deck.id}`}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          Manage
                        </Link>
                        <button
                          onClick={() => handleDeleteDeck(deck.id, deck.name)}
                          className="px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                          aria-label="Delete deck"
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
            <h3 className="font-semibold text-gray-800">New Deck</h3>
            <input
              autoFocus
              required
              type="text"
              placeholder="Deck name"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <select
              value={form.cardType}
              onChange={e => setForm(p => ({ ...p, cardType: e.target.value as Deck['cardType'] }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="custom">Custom</option>
              <option value="word">Word</option>
              <option value="vowel">Vowel</option>
              <option value="consonant">Consonant</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                Create
              </button>
              <button type="button" onClick={() => setShowNewDeck(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowNewDeck(true)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium hover:border-indigo-300 hover:text-indigo-500 transition-colors"
          >
            + New Deck
          </button>
        )}

        {/* Stats link */}
        {data.reviewLogs.length > 0 && (
          <Link to="/stats" className="block text-center text-sm text-indigo-500 hover:text-indigo-700 py-2">
            View learning stats →
          </Link>
        )}
      </main>
    </div>
  );
}
