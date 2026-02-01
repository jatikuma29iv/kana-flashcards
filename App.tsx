import React, { useEffect, useMemo, useState, useRef } from "react";
import { SafeAreaView, StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { Animated, PanResponder } from "react-native";
import { FlashCard } from "./src/components/FlashCard";
import { DrawingPad } from "./src/components/DrawingPad";
import { parseKanaTSV } from "./src/logic/tsv";
import type { KanaDeckItem } from "./src/logic/srs";
import { applyResult, nextQuizPick } from "./src/logic/srs";
import { loadDeck, resetDeck, saveDeck } from "./src/logic/storage";
import { bumpModeStat, loadModeStats, saveModeStats, type ModeKey } from "./src/logic/modeStats";

//import sampleTSV from "./src/data/sample.tsv";
const sampleTSV = require("./src/data/sample.tsv");
import { loadTSV } from "./src/logic/loadTSV";

// Expo/Metro can import text assets as string if configured,
// but simplest: embed sample TSV here for now.
// Replace SAMPLE_TSV with your real TSV later (or add upload UI).
//const SAMPLE_TSV = `a\tあ\tア
//i\tい\tイ
//u\tう\tウ
//e\tえ\tエ
//o\tお\tオ
//ka\tか\tカ
//ki\tき\tキ
//ku\tく\tク
//ke\tけ\tケ
//ko\tこ\tコ`;

type Phase = "question" | "revealed";

export default function App() {
  const [deck, setDeck] = useState<KanaDeckItem[]>([]);
  const [phase, setPhase] = useState<Phase>("question");
  const [isFlipped, setIsFlipped] = useState(false);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentSide, setCurrentSide] = useState<"hiragana" | "katakana">("hiragana");
  const [drawKey, setDrawKey] = useState(0);

  type QuizMode = "R2K" | "K2R"; // Romaji->Kana OR Kana->Romaji
  const [mode, setMode] = useState<QuizMode>("R2K");

  const [cardKey, setCardKey] = useState(0); // ✅ forces FlashCard reset

  const [flash, setFlash] = useState<null | "correct" | "wrong">(null);

  // session progress
  const SESSION_TARGET = 20;
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);

  const [modeStats, setModeStats] = useState<Record<string, {correct:number; wrong:number}>>({});

  // swipe card
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeRot = swipeX.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ["-8deg", "0deg", "8deg"],
  });

  const SWIPE_THRESHOLD = 80;

  // swipe opacity
  const swipeOpacity = swipeX.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: [0.6, 1, 0.6],
  });

  useEffect(() => {
    (async () => {
      const ms = await loadModeStats();
      setModeStats(ms);
    })();
  }, []);

  useEffect(() => {
    saveModeStats(modeStats).catch(() => {});
  }, [modeStats]);

  // init deck (load saved progress; otherwise create fresh from TSV)
  useEffect(() => {
    (async () => {
      const saved = await loadDeck();
      if (saved?.length) {
        setDeck(saved);
        const pick = nextQuizPick(saved);
        setCurrentId(pick.item.id);
        setCurrentSide(pick.side);
        return;
      }

      //const base = parseKanaTSV(SAMPLE_TSV);
      // 👇 LOAD TSV FROM FILE
      const tsvText = await loadTSV(sampleTSV);
      const base = parseKanaTSV(tsvText);

      const fresh: KanaDeckItem[] = base.map((r) => ({
        ...r,
        stats: { correct: 0, wrong: 0, lastSeenAt: 0 },
      }));
      setDeck(fresh);

      const pick = nextQuizPick(fresh);
      setCurrentId(pick.item.id);
      setCurrentSide(pick.side);
      await saveDeck(fresh);
    })();
  }, []);

  // persist on changes
  useEffect(() => {
    if (!deck.length) return;
    saveDeck(deck).catch(() => {});
  }, [deck]);

  const current = useMemo(() => {
    if (!currentId) return null;
    return deck.find((d) => d.id === currentId) ?? null;
  }, [deck, currentId]);

  const answerText = useMemo(() => {
    if (!current) return "";
    return currentSide === "hiragana" ? current.hiragana : current.katakana;
  }, [current, currentSide]);

  const onNext = (updatedDeck: KanaDeckItem[]) => {
    const pick = nextQuizPick(updatedDeck);
    setCurrentId(pick.item.id);
    setCurrentSide(pick.side);

    setPhase("question");
    setIsFlipped(false);

    setDrawKey((k) => k + 1); // ✅ clears drawing (remount DrawingPad)
    setCardKey((k) => k + 1); // ✅ reset flash card to front

    console.log("cardKey++");
  };

  const mark = (result: "correct" | "wrong") => {
    if (!current) return;

    // flash feedback
    setFlash(result);

    // session stats
    setSessionTotal((n) => n + 1);
    if (result === "correct") setSessionCorrect((n) => n + 1);
    else setSessionWrong((n) => n + 1);

    // update learning stats
    const updated = applyResult(deck, current.id, result);
    setDeck(updated);

    setModeStats((prev) => bumpModeStat(prev, mode as ModeKey, currentSide, current.id, result));

    // auto advance after 200ms
    setTimeout(() => {
      setFlash(null);
      onNext(updated);
    }, 200);
  };
  const changeMode = (m: QuizMode) => {
      setMode(m);
      onNext(deck);             // pick a fresh question in new mode
      setCardKey((k) => k + 1); // force reset (extra safe)
  };

  const onFlipChange = (flipped: boolean) => {
    setIsFlipped(flipped);
    setPhase(flipped ? "revealed" : "question");
  };

  // swipe handler with animation
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 10 && Math.abs(g.dy) < 25,

        onPanResponderMove: (_, g) => {
          swipeX.setValue(g.dx);
        },

        onPanResponderRelease: (_, g) => {
          const dx = g.dx;

          if (Math.abs(dx) > SWIPE_THRESHOLD) {
            // fly out
            const dir = dx > 0 ? 1 : -1;
            Animated.timing(swipeX, {
              toValue: dir * 600,
              duration: 220,
              useNativeDriver: true,
            }).start(() => {
              // reset position for next card
              swipeX.setValue(0);

              // next card
              onNext(deck);
            });
          } else {
            // snap back
            Animated.spring(swipeX, {
              toValue: 0,
              useNativeDriver: true,
              friction: 7,
              tension: 70,
            }).start();
          }
        },
      }),
    [deck] // uses current deck for onNext(deck)
  );

  if (!current) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ color: "white" }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const frontText =
      mode === "R2K"
      ? current.romaji
      : (currentSide === "hiragana" ? current.hiragana : current.katakana);

  const backText =
      mode === "R2K"
      ? (currentSide === "hiragana" ? current.hiragana : current.katakana)
      : current.romaji;

  const frontLabel =
      mode === "R2K"
      ? `ROMAJI • show ${currentSide.toUpperCase()}`
          : `${currentSide.toUpperCase()} • guess ROMAJI`;

  const backLabel = "ANSWER";

  const accuracy = sessionTotal === 0 ? 0 : Math.round((sessionCorrect / sessionTotal) * 100);

  const msKey = `${mode}:${currentSide}:${current.id}`;
  const ms = modeStats[msKey] ?? { correct: 0, wrong: 0 };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => setMenuOpen(true)} style={styles.menuBtn}>
          <Text style={styles.menuText}>☰</Text>
        </Pressable>
        <Text style={styles.title}>Kana Flashcards</Text>
        <Pressable onPress={() => onNext(deck)} style={styles.nextBtn}>
          <Text style={styles.nextText}>Next</Text>
        </Pressable>
      </View>
      <View style={styles.modeRow}>
        <Pressable
          onPress={() => changeMode("R2K")}
          style={[styles.modeBtn, mode === "R2K" && styles.modeBtnActive]}
        >
          <Text style={[styles.modeText, mode === "R2K" && styles.modeTextActive]}>
            Romaji → Kana
          </Text>
        </Pressable>

        <Pressable
          onPress={() => changeMode("K2R")}
          style={[styles.modeBtn, mode === "K2R" && styles.modeBtnActive]}
        >
          <Text style={[styles.modeText, mode === "K2R" && styles.modeTextActive]}>
            Kana → Romaji
          </Text>
        </Pressable>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          Session: {sessionTotal} / {SESSION_TARGET} • Accuracy: {accuracy}%
        </Text>
      </View>

      {/* Split Screen */}
      <View style={styles.container}>
        {/* TOP: Flashcard */}
        <View style={styles.top}>
          <View style={styles.cardWrap} {...swipe.panHandlers}>
            <Animated.View
              style={{
                flex: 1,
                transform: [{ translateX: swipeX }, { rotate: swipeRot }],
                opacity: swipeOpacity,
              }}
            >
              <FlashCard
                key={cardKey}
                frontTopLabel={frontLabel}
                frontText={frontText}
                backTopLabel={backLabel}
                backText={backText}
                onFlipChange={onFlipChange}
                resetKey={cardKey}
              />
            </Animated.View>

            {flash && (
              <View style={[styles.flash, flash === "correct" ? styles.flashGreen : styles.flashRed]} />
            )}
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <Pressable
              onPress={() => mark("wrong")}
              disabled={!isFlipped}
              style={[styles.ctrlBtn, !isFlipped && styles.disabled]}
            >
              <Text style={styles.ctrlText}>Wrong</Text>
            </Pressable>

            <Pressable
              onPress={() => mark("correct")}
              disabled={!isFlipped}
              style={[styles.ctrlBtn, !isFlipped && styles.disabled]}
            >
              <Text style={styles.ctrlText}>Correct</Text>
            </Pressable>
          </View>

          {/*
          <View style={styles.statsRow}>
            <Text style={styles.stat}>
              C: {current.stats.correct} / W: {current.stats.wrong}
            </Text>
            <Text style={styles.stat}>Mode C:{ms.correct} W:{ms.wrong}</Text>
            <Text style={styles.stat}>Phase: {phase}</Text>
          </View>
          */}
        </View>

        {/* BOTTOM: Drawing */}
        <View style={styles.bottom}>
          <DrawingPad key={drawKey} />
        </View>
      </View>

      {/* Debug panel (optional) 
      <ScrollView style={styles.debug} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={styles.debugTitle}>Debug: hardest items</Text>
        {deck
          .slice()
          .sort((a, b) => (b.stats.wrong - b.stats.correct) - (a.stats.wrong - a.stats.correct))
          .slice(0, 8)
          .map((d) => (
            <Text key={d.id} style={styles.debugLine}>
              {d.romaji} — {d.hiragana}/{d.katakana}  (C:{d.stats.correct} W:{d.stats.wrong})
            </Text>
          ))}
      </ScrollView>
      */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7fbff" },
  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: "#e6f2ff", borderWidth: 1, borderColor: "#b9ddff" },
  menuText: { color: "#0b1b2b", fontSize: 16, fontWeight: "700" },
  title: { color: "#0b1b2b", fontSize: 16, fontWeight: "700" },
  nextBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: "#e6f2ff",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#b9ddff",
  },
  nextText: { color: "#0b1b2b", fontSize: 12, fontWeight: "700" },
  container: { flex: 1, padding: 12, gap: 12 },
  top: { flex: 1, gap: 10, position: "relative" },
  bottom: { flex: 1 },
  controls: { flexDirection: "row", gap: 10, justifyContent: "center" },
  ctrlBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#1f1f1f",
    alignItems: "center",
    justifyContent: "center",
  },
  ctrlText: { color: "white", fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.35 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { color: "#aaa", fontSize: 12 },
  debug: { maxHeight: 140, paddingHorizontal: 14 },
  debugTitle: { color: "#ddd", fontSize: 12, marginBottom: 6 },
  debugLine: { color: "#888", fontSize: 12, marginBottom: 2 },
  modeRow: {
      paddingHorizontal: 12,
      paddingBottom: 6,
      flexDirection: "row",
      gap: 10,
  },
  modeBtn: {
      flex: 1,
      height: 38,
      borderRadius: 14,
      backgroundColor: "white",
      borderWidth: 1,
      borderColor: "#b9ddff",
      alignItems: "center",
      justifyContent: "center",
  },
  modeBtnActive: {
      backgroundColor: "#e6f2ff",
  },
  modeText: { color: "#4a6a86", fontSize: 12, fontWeight: "700" },
  modeTextActive: { color: "#0b1b2b" },
  flash: {
  ...StyleSheet.absoluteFillObject,
  borderRadius: 18,
  opacity: 0.25,
  pointerEvents: "none",
},
flashGreen: { backgroundColor: "#2ecc71" },
flashRed: { backgroundColor: "#ff4d4d" },
progressRow: { paddingHorizontal: 12, paddingBottom: 6 },
progressText: { color: "#4a6a86", fontSize: 12, fontWeight: "700" },
cardWrap: { flex: 1 },
});
