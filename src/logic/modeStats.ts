import AsyncStorage from "@react-native-async-storage/async-storage";

export type ModeKey = "R2K" | "K2R";
export type SideKey = "hiragana" | "katakana";

export type ModeStats = {
  [key: string]: { correct: number; wrong: number }; 
  // key = `${mode}:${side}:${id}`
};

const KEY = "kana_mode_stats_v1";

export async function loadModeStats(): Promise<ModeStats> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  try { return JSON.parse(raw) as ModeStats; } catch { return {}; }
}

export async function saveModeStats(stats: ModeStats) {
  await AsyncStorage.setItem(KEY, JSON.stringify(stats));
}

export function bumpModeStat(
  stats: ModeStats,
  mode: ModeKey,
  side: SideKey,
  id: string,
  result: "correct" | "wrong"
): ModeStats {
  const k = `${mode}:${side}:${id}`;
  const cur = stats[k] ?? { correct: 0, wrong: 0 };
  const next = {
    correct: cur.correct + (result === "correct" ? 1 : 0),
    wrong: cur.wrong + (result === "wrong" ? 1 : 0),
  };
  return { ...stats, [k]: next };
}