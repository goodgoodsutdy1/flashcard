import type { Card } from '../types';

export interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueDate: string;
}

export function sm2Next(
  card: Pick<Card, 'interval' | 'repetitions' | 'easeFactor'>,
  quality: 0 | 1 | 2 | 3 | 4 | 5
): SM2Result {
  let { interval, repetitions, easeFactor } = card;

  if (quality < 3) {
    interval = 1;
    repetitions = 0;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions++;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);

  return {
    interval,
    repetitions,
    easeFactor,
    dueDate: dueDate.toISOString(),
  };
}
