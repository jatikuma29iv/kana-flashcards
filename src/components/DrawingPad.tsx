import React, { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, View, Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";

type Stroke = { d: string };

export function DrawingPad() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const [layout, setLayout] = useState({ w: 1, h: 1 });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (evt) => {
          const { locationX: x, locationY: y } = evt.nativeEvent;
          pointsRef.current = [{ x, y }];

          // ✅ create a new stroke immediately (so updates always have a target)
          setStrokes((prev) => [...prev, { d: `M ${x} ${y}` }]);
          setRedoStack([]); // 👈 ADD THIS
        },

        onPanResponderMove: (evt) => {
          const { locationX: x, locationY: y } = evt.nativeEvent;
          pointsRef.current.push({ x, y });

          const d = pointsToPath(pointsRef.current);

          // ✅ update only the last stroke (no slicing away existing ones)
          setStrokes((prev) => {
            if (!prev.length) return prev;
            const next = prev.slice();
            next[next.length - 1] = { d };
            return next;
          });
        },

        onPanResponderRelease: () => {
          // nothing to trim; last stroke is already finalized
          pointsRef.current = [];
        },
      }),
    []
  );

  const undo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      const removed = prev[prev.length - 1];
      setRedoStack((r) => [removed, ...r]);
      return next;
    });
  };

  const redo = () => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const [restored, ...remaining] = r;
      setStrokes((s) => [...s, restored]);
      return remaining;
    });
  };

  function makeGridPath(w: number, h: number) {
    if (w <= 1 || h <= 1) return "";

    const xMid = w / 2;
    const yMid = h / 2;

    const inset = 18;
    const x1 = inset, y1 = inset, x2 = w - inset, y2 = h - inset;

    const xQ1 = w / 4, xQ3 = (3 * w) / 4;
    const yQ1 = h / 4, yQ3 = (3 * h) / 4;

    return [
      `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2} L ${x1} ${y2} L ${x1} ${y1}`,
      `M ${xMid} ${y1} L ${xMid} ${y2}`,
      `M ${x1} ${yMid} L ${x2} ${yMid}`,
      `M ${xQ1} ${y1} L ${xQ1} ${y2}`,
      `M ${xQ3} ${y1} L ${xQ3} ${y2}`,
      `M ${x1} ${yQ1} L ${x2} ${yQ1}`,
      `M ${x1} ${yQ3} L ${x2} ${yQ3}`,
    ].join(" ");
  }

  const clear = () => setStrokes([]);

  return (
    <View
      style={styles.root}
      onLayout={(e) =>
        setLayout({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }
      {...panResponder.panHandlers}
    >
      <Svg width={layout.w} height={layout.h}>
        {/* Grid */}
        {layout.w > 1 && layout.h > 1 && (
          <Path
            d={makeGridPath(layout.w, layout.h)}
            stroke="#b9ddff"
            strokeWidth={1}
            fill="none"
          />
        )}

        {/* Strokes */}
        {strokes.map((s, idx) => (
          <Path
            key={idx}
            d={s.d}
            stroke="#0b1b2b"
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </Svg> 
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Left cluster: label + undo/redo (captures touches) */}
        <View
          style={styles.leftGroup}
          pointerEvents="auto"
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
        >
          <Text style={styles.overlayText}>Draw here</Text>

          <Pressable
            onPress={() => {
              if (strokes.length === 0) return;
              undo();
            }}
            style={[styles.iconBtn, strokes.length === 0 && styles.iconDisabled]}
            hitSlop={10}
          >
            <Text style={styles.iconText}>⟲</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (redoStack.length === 0) return;
              redo();
            }}
            style={[styles.iconBtn, redoStack.length === 0 && styles.iconDisabled]}
            hitSlop={10}
          >
            <Text style={styles.iconText}>⟳</Text>
          </Pressable>
        </View>

        {/* Right: Clear (also captures touches) */}
        <View
          style={styles.rightGroup}
          pointerEvents="auto"
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
        >
          <Pressable onPress={clear} style={styles.button} hitSlop={10}>
            <Text style={styles.buttonText}>Clear</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function pointsToPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  const [p0, ...rest] = points;
  let d = `M ${p0.x} ${p0.y}`;
  for (const p of rest) d += ` L ${p.x} ${p.y}`;
  return d;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#eaf5ff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cfe6ff",
  },
  overlay: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  overlayText: { color: "#4a6a86", fontSize: 12 },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#b9ddff",
  },
  buttonText: { color: "#0b1b2b", fontSize: 12, fontWeight: "700" },
  tools: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#b9ddff",
    alignItems: "center",
    justifyContent: "center",
  },
  iconDisabled: {
    opacity: 0.35,
  },
  iconText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0b1b2b",
  },
});