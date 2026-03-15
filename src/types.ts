export interface Deck {
  id: string;
  name: string;
  description: string;
  cardType: 'word' | 'vowel' | 'consonant' | 'custom';
  createdAt: string;
}

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  phonetic?: string;
  example?: string;
  audioText: string;
  // SM-2 fields
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueDate: string;
  lastReviewed?: string;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  deckId: string;
  quality: number;
  reviewedAt: string;
}

export interface AppData {
  decks: Deck[];
  cards: Card[];
  reviewLogs: ReviewLog[];
}
