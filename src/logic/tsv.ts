export type KanaRow = {
    id: string;          // stable id (romaji)
    romaji: string;
    hiragana: string;
    katakana: string;
  };
  
  export function parseKanaTSV(tsvText: string): KanaRow[] {
    const lines = tsvText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
  
    const rows: KanaRow[] = [];
  
    for (const line of lines) {
      const [romaji, hiragana, katakana] = line.split("\t");
      if (!romaji || !hiragana || !katakana) continue;
  
      rows.push({
        id: romaji.trim(),
        romaji: romaji.trim(),
        hiragana: hiragana.trim(),
        katakana: katakana.trim(),
      });
    }
  
    return rows;
  }