import type { AppData, Deck, Card, ReviewLog } from '../types';

const STORAGE_KEY = 'flashcard_data';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getDefaultData(): AppData {
  return { decks: [], cards: [], reviewLogs: [] };
}

// Fix old audioText like "æ, as in cat" → "cat"
function migrateCard(card: Card): Card {
  if (card.audioText && card.audioText.includes(', as in ')) {
    return { ...card, audioText: card.audioText.split(', as in ')[1] };
  }
  return card;
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const cards = (parsed.cards ?? []).map(migrateCard);
    // Persist the migration if anything changed
    if (cards.some((c, i) => c !== (parsed.cards ?? [])[i])) {
      const migrated = { decks: parsed.decks ?? [], cards, reviewLogs: parsed.reviewLogs ?? [] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return { decks: parsed.decks ?? [], cards, reviewLogs: parsed.reviewLogs ?? [] };
  } catch {
    return getDefaultData();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Deck operations
export function createDeck(deck: Omit<Deck, 'id' | 'createdAt'>): Deck {
  const newDeck: Deck = {
    ...deck,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  const data = loadData();
  data.decks.push(newDeck);
  saveData(data);
  return newDeck;
}

export function updateDeck(id: string, updates: Partial<Omit<Deck, 'id'>>): void {
  const data = loadData();
  const idx = data.decks.findIndex(d => d.id === id);
  if (idx !== -1) {
    data.decks[idx] = { ...data.decks[idx], ...updates };
    saveData(data);
  }
}

export function deleteDeck(id: string): void {
  const data = loadData();
  data.decks = data.decks.filter(d => d.id !== id);
  data.cards = data.cards.filter(c => c.deckId !== id);
  saveData(data);
}

// Card operations
export function createCard(card: Omit<Card, 'id' | 'interval' | 'repetitions' | 'easeFactor' | 'dueDate'>): Card {
  const newCard: Card = {
    ...card,
    id: generateId(),
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: new Date().toISOString(),
  };
  const data = loadData();
  data.cards.push(newCard);
  saveData(data);
  return newCard;
}

export function updateCard(id: string, updates: Partial<Omit<Card, 'id'>>): void {
  const data = loadData();
  const idx = data.cards.findIndex(c => c.id === id);
  if (idx !== -1) {
    data.cards[idx] = { ...data.cards[idx], ...updates };
    saveData(data);
  }
}

export function deleteCard(id: string): void {
  const data = loadData();
  data.cards = data.cards.filter(c => c.id !== id);
  saveData(data);
}

export function addReviewLog(log: Omit<ReviewLog, 'id' | 'reviewedAt'>): void {
  const data = loadData();
  data.reviewLogs.push({
    ...log,
    id: generateId(),
    reviewedAt: new Date().toISOString(),
  });
  // Keep only last 1000 logs to prevent unbounded growth
  if (data.reviewLogs.length > 1000) {
    data.reviewLogs = data.reviewLogs.slice(-1000);
  }
  saveData(data);
}

export function getDueCards(deckId?: string): Card[] {
  const data = loadData();
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return data.cards.filter(c => {
    if (deckId && c.deckId !== deckId) return false;
    return new Date(c.dueDate) <= today;
  });
}

export function getCardsForDeck(deckId: string): Card[] {
  const data = loadData();
  return data.cards.filter(c => c.deckId === deckId);
}
