import React, { useMemo, useRef, useState, useEffect } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  frontTopLabel: string;     // e.g. "ROMAJI"
  frontText: string;         // romaji
  backTopLabel: string;      // "ANSWER"
  backText: string;          // kana char
  onFlipChange?: (isFlipped: boolean) => void;
  resetKey: number; // ✅ add
};

export function FlashCard({
  frontTopLabel,
  frontText,
  backTopLabel,
  backText,
  onFlipChange,
  resetKey,
}: Props) {
  const [flipped, setFlipped] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const rotateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const frontOpacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const backOpacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  useEffect(() => {
    // force back to front side
    setFlipped(false);
    anim.stopAnimation();
    anim.setValue(0);
    onFlipChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const flip = () => {
    const toValue = flipped ? 0 : 1;
    Animated.spring(anim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
    const next = !flipped;
    setFlipped(next);
    onFlipChange?.(next);
  };

  const containerStyle = useMemo(
    () => [{ transform: [{ rotateY }] }],
    [rotateY]
  );

  return (
    <Pressable onPress={flip} style={styles.root}>
      <Animated.View style={[styles.card, containerStyle]}>
        {/* FRONT */}
        <Animated.View style={[styles.face, { opacity: frontOpacity }]}>
          <Text style={styles.label}>{frontTopLabel}</Text>
          <Text style={styles.big}>{frontText}</Text>
          <Text style={styles.hint}>Tap to flip</Text>
        </Animated.View>

        {/* BACK */}
        <Animated.View
          style={[
            styles.face,
            styles.backFace,
            { opacity: backOpacity, transform: [{ rotateY: "180deg" }] },
          ]}
        >
          <Text style={styles.label}>{backTopLabel}</Text>
          <Text style={styles.kana}>{backText}</Text>
          <Text style={styles.hint}>Tap to flip back</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: "100%" },
  card: {
      flex: 1,
      borderRadius: 18,
      backgroundColor: "white",
      borderWidth: 1,
      borderColor: "#cfe6ff",
      overflow: "hidden",
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  backFace: {},
  label: {
      position: "absolute",
      top: 12,
      left: 12,
      color: "#4a6a86",
      fontSize: 12,
      letterSpacing: 1,
  },
  big: { color: "#0b1b2b", fontSize: 42, fontWeight: "700" },
  kana: { color: "#0b1b2b", fontSize: 84, fontWeight: "700" },
  hint: { position: "absolute", bottom: 12, color: "#6b8aa6", fontSize: 12 },
});
