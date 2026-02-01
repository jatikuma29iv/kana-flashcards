import type { KanaRow } from "./tsv";

export type KanaStats = {
  correct: number;
  wrong: number;
  lastSeenAt: number;     // epoch ms
  lastResult?: "correct" | "wrong";
};

export type KanaDeckItem = KanaRow & {
  stats: KanaStats;
};

export type QuizSide = "hiragana" | "katakana";

export type QuizPick = {
  item: KanaDeckItem;
  side: QuizSide;
};

// Weight rules (tune these freely):
// - Wrong answers increase weight a lot
// - Correct answers reduce weight slightly
// - Items not seen recently gradually increase weight
export function computeWeight(item: KanaDeckItem, now: number): number {
  const { correct, wrong, lastSeenAt } = item.stats;

  const base = 1;

  const wrongBoost = wrong * 3;          // big effect
  const correctPenalty = correct * 0.5;  // gentle reduction

  const minutesSince = Math.max(0, (now - lastSeenAt) / 60000);
  const recencyBoost = Math.min(5, minutesSince / 10); // up to +5

  const weight = base + wrongBoost + recencyBoost - correctPenalty;
  return Math.max(0.2, weight); // never zero
}

export function weightedRandomPick(deck: KanaDeckItem[], now: number): KanaDeckItem {
  const weights = deck.map(d => computeWeight(d, now));
  const total = weights.reduce((a, b) => a + b, 0);

  let r = Math.random() * total;
  for (let i = 0; i < deck.length; i++) {
    r -= weights[i];
    if (r <= 0) return deck[i];
  }
  return deck[deck.length - 1];
}

export function nextQuizPick(deck: KanaDeckItem[]): QuizPick {
  const now = Date.now();
  const item = weightedRandomPick(deck, now);
  const side: QuizSide = Math.random() < 0.5 ? "hiragana" : "katakana";
  return { item, side };
}

export function applyResult(
  deck: KanaDeckItem[],
  itemId: string,
  result: "correct" | "wrong"
): KanaDeckItem[] {
  const now = Date.now();

  return deck.map(d => {
    if (d.id !== itemId) return d;

    const stats = { ...d.stats };
    stats.lastSeenAt = now;
    stats.lastResult = result;

    if (result === "correct") stats.correct += 1;
    else stats.wrong += 1;

    return { ...d, stats };
  });
}