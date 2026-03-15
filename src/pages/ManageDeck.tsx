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

// ── Word lookup via Free Dictionary API + MyMemory translation ───────────────
interface DictEntry {
  phonetics: { text?: string }[];
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}

async function translateToZh(text: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh`
    );
    if (!res.ok) return '';
    const json = await res.json();
    const translated: string = json?.responseData?.translatedText ?? '';
    // MyMemory sometimes returns the original text if it fails
    return translated && translated !== text ? translated : '';
  } catch {
    return '';
  }
}

async function lookupWord(word: string): Promise<Partial<CardForm> | null> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim())}`);
    if (!res.ok) return null;
    const data: DictEntry[] = await res.json();
    const entry = data[0];
    const phonetic = entry.phonetics.find(p => p.text)?.text ?? '';
    const meaning = entry.meanings[0];
    const def = meaning?.definitions[0];
    const enDef = def ? `(${meaning.partOfSpeech}) ${def.definition}` : '';
    const example = def?.example ?? '';

    // Try to get Chinese translation of the definition
    const zhDef = enDef ? await translateToZh(def!.definition) : '';
    const back = zhDef ? `${zhDef}\n${enDef}` : enDef;

    return { phonetic, back, example, audioText: word.trim() };
  } catch {
    return null;
  }
}

// ── Bulk import parser ───────────────────────────────────────────────────────
interface ParsedCard {
  front: string;
  back: string;
}

function parseImportText(text: string): ParsedCard[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      // Tab-separated (有道词典/Excel): word\tmeaning
      if (line.includes('\t')) {
        const [front, ...rest] = line.split('\t');
        return { front: front.trim(), back: rest.join('\t').trim() };
      }
      // Dash-separated: word - meaning  or  word — meaning
      const dashMatch = line.match(/^(.+?)\s+[-—]\s+(.+)$/);
      if (dashMatch) {
        return { front: dashMatch[1].trim(), back: dashMatch[2].trim() };
      }
      // Colon-separated: word: meaning
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0 && colonIdx < line.length - 1) {
        return { front: line.slice(0, colonIdx).trim(), back: line.slice(colonIdx + 1).trim() };
      }
      // Single word only — front only, back empty (user fills later or auto-lookup)
      return { front: line.trim(), back: '' };
    })
    .filter(c => c.front.length > 0);
}

// ────────────────────────────────────────────────────────────────────────────

export function ManageDeck() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState<Card | null>(null);
  const [form, setForm] = useState<CardForm>(emptyForm);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [editDeckName, setEditDeckName] = useState(false);
  const [deckNameForm, setDeckNameForm] = useState('');

  // Bulk import state
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importParsed, setImportParsed] = useState<ParsedCard[]>([]);
  const [importLookup, setImportLookup] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const refresh = () => {
    if (!deckId) return;
    const data = loadData();
    const d = data.decks.find(dk => dk.id === deckId) ?? null;
    setDeck(d);
    setCards(data.cards.filter(c => c.deckId === deckId));
  };

  useEffect(() => { refresh(); }, [deckId]);

  // ── Single card form ────────────────────────────────────────────────────

  const handleLookup = async () => {
    const word = form.front.trim();
    if (!word) return;
    setLookupLoading(true);
    setLookupError('');
    const result = await lookupWord(word);
    setLookupLoading(false);
    if (result) {
      setForm(p => ({
        ...p,
        back: result.back || p.back,
        phonetic: result.phonetic || p.phonetic,
        example: result.example || p.example,
        audioText: result.audioText || p.audioText || word,
      }));
    } else {
      setLookupError('未找到该单词，请检查拼写或手动填写');
    }
  };

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
    setLookupError('');
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
    setShowImport(false);
    setLookupError('');
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

  // ── Bulk import ─────────────────────────────────────────────────────────

  const handleParseImport = () => {
    const parsed = parseImportText(importText);
    setImportParsed(parsed);
  };

  const handleImport = async () => {
    if (!deckId || importParsed.length === 0) return;
    setImportLoading(true);

    const cardsToCreate = [...importParsed];

    if (importLookup) {
      // Auto-lookup words that have no back text
      for (let i = 0; i < cardsToCreate.length; i++) {
        if (!cardsToCreate[i].back) {
          const result = await lookupWord(cardsToCreate[i].front);
          if (result?.back) {
            cardsToCreate[i] = { ...cardsToCreate[i], back: result.back };
          } else {
            cardsToCreate[i] = { ...cardsToCreate[i], back: cardsToCreate[i].front };
          }
        }
      }
    }

    for (const c of cardsToCreate) {
      if (!c.back) continue; // skip if still no back
      createCard({
        deckId,
        front: c.front,
        back: c.back,
        audioText: c.front,
      });
    }

    setImportText('');
    setImportParsed([]);
    setShowImport(false);
    setImportLoading(false);
    refresh();
  };

  // ────────────────────────────────────────────────────────────────────────

  if (!deck) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400">加载中...</p>
    </div>
  );

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
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm text-gray-400">{cards.length} 张</span>
            {!editDeckName && (
              <button
                onClick={() => { setShowImport(true); setShowForm(false); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-sm font-medium hover:bg-green-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                导入
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {/* ── Single card form ── */}
        {showForm && (
          <form onSubmit={handleSubmitCard} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">{editCard ? '编辑卡片' : '新建卡片'}</h3>

            {/* Front + lookup */}
            <div className="flex gap-2">
              <input
                required
                type="text"
                placeholder="正面（单词/符号）"
                value={form.front}
                onChange={e => {
                  setForm(p => ({ ...p, front: e.target.value }));
                  setLookupError('');
                }}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={lookupLoading || !form.front.trim()}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 whitespace-nowrap"
              >
                {lookupLoading ? '查询中…' : '自动查询'}
              </button>
            </div>
            {lookupError && (
              <p className="text-xs text-red-500">{lookupError}</p>
            )}

            <div className="space-y-2">
              <textarea
                required
                placeholder="背面（释义）"
                value={form.back}
                onChange={e => setForm(p => ({ ...p, back: e.target.value }))}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <input
                type="text"
                placeholder="音标（可选，如 /wɜːrd/）"
                value={form.phonetic}
                onChange={e => setForm(p => ({ ...p, phonetic: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="text"
                placeholder="例句（可选）"
                value={form.example}
                onChange={e => setForm(p => ({ ...p, example: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="text"
                placeholder="朗读文本（默认同正面）"
                value={form.audioText}
                onChange={e => setForm(p => ({ ...p, audioText: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                {editCard ? '保存修改' : '添加卡片'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditCard(null); setForm(emptyForm); setLookupError(''); }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600"
              >
                取消
              </button>
            </div>
          </form>
        )}

        {showImport && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">批量导入单词</h3>
              <button onClick={() => { setShowImport(false); setImportText(''); setImportParsed([]); }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            {/* 有道导出步骤 */}
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-800">如何从有道词典导出单词</p>
              <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
                <li>打开有道词典 App → 底部"单词本"</li>
                <li>右上角菜单 → "导出单词本"</li>
                <li>选择导出格式 <b>TXT</b>（Tab 分隔）</li>
                <li>分享/复制导出内容，粘贴到下方文本框</li>
              </ol>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
              <p className="font-medium text-gray-700">也支持以下格式（每行一条）：</p>
              <p>· <b>Tab 分隔</b>：<code className="bg-white px-1 rounded">单词[Tab]释义</code>（有道/Excel）</p>
              <p>· <b>短横线</b>：<code className="bg-white px-1 rounded">单词 - 释义</code></p>
              <p>· <b>仅单词</b>：每行一个词，勾选下方"自动查询"补全释义</p>
            </div>

            <textarea
              placeholder={'在此粘贴导出内容，例：\nabandon\t放弃，遗弃\naccurate\t精确的，准确的\nachieve\t实现，达到'}
              value={importText}
              onChange={e => { setImportText(e.target.value); setImportParsed([]); }}
              rows={6}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none font-mono"
            />

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={importLookup}
                onChange={e => setImportLookup(e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              自动查询无释义的单词（联网补全中文释义）
            </label>

            {importParsed.length === 0 ? (
              <button
                onClick={handleParseImport}
                disabled={!importText.trim()}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-40"
              >
                解析预览
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">预览（共 {importParsed.length} 条）</p>
                <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2">
                  {importParsed.map((c, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="font-medium text-gray-800 min-w-0 truncate flex-shrink-0 w-32">{c.front}</span>
                      <span className={`text-gray-500 truncate ${!c.back ? 'italic text-orange-400' : ''}`}>
                        {c.back || '（待查询）'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleImport}
                    disabled={importLoading}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {importLoading ? '导入中…' : `导入全部 ${importParsed.length} 张`}
                  </button>
                  <button
                    onClick={() => setImportParsed([])}
                    className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600"
                  >
                    重新编辑
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Cards list ── */}
        {cards.map(card => {
          const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
          const isDue = new Date(card.dueDate) <= todayEnd;
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
                  <button
                    onClick={() => handleEdit(card)}
                    className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-500 transition-colors text-sm"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDelete(card)}
                    className="p-2 rounded-lg bg-gray-50 text-red-300 hover:bg-red-50 hover:text-red-500 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Bottom add button ── */}
        {!showForm && !showImport && (
          <button
            onClick={() => { setShowForm(true); setEditCard(null); setForm(emptyForm); setLookupError(''); }}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium hover:border-indigo-300 hover:text-indigo-500 transition-colors"
          >
            + 添加卡片
          </button>
        )}

        {cards.length === 0 && !showForm && !showImport && (
          <p className="text-center text-gray-400 text-sm py-8">还没有卡片，添加第一张吧！</p>
        )}
      </main>
    </div>
  );
}
