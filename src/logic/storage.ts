import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KanaDeckItem } from "./srs";

const KEY = "kana_deck_v1";

export async function saveDeck(deck: KanaDeckItem[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(deck));
}

export async function loadDeck(): Promise<KanaDeckItem[] | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as KanaDeckItem[];
  } catch {
    return null;
  }
}

export async function resetDeck() {
  await AsyncStorage.removeItem(KEY);
}