---

## `prompt.md`

```md
# Prompt to Reproduce the Entire App (Expo RN Web Flashcards + Drawing Pad)

Use this prompt to regenerate the full application from scratch in one go.

---

## Prompt

You are a senior React Native + Expo engineer.

Build a complete **Expo (React Native + Web)** flashcard handwriting practice app.

### Core Input (Deck)
- The deck is a **TSV** file with **3 columns**:
  1. `romaji`
  2. `hiragana`
  3. `katakana`
- One row per item: `romaji<TAB>hiragana<TAB>katakana`

### App Behavior
- The app shows a **split screen**:
  - **Top half**: a **flip-able flash card**
  - **Bottom half**: a **full-area drawing pad** where the user practices writing the shown kana
- Each round selects an item using a “smart” logic:
  - Use **weighted random selection** so items marked wrong more frequently appear more often.
  - Weight should consider:
    - wrong count strongly increases probability
    - correct count slightly decreases probability
    - time since last seen increases probability
- Each question randomly chooses **hiragana OR katakana** for that round.

### Flash Card Modes
Add a mode switch with 2 options:
- **R2K** (Romaji → Kana)
  - Front: romaji
  - Back: kana (hiragana or katakana based on the chosen side)
- **K2R** (Kana → Romaji)
  - Front: kana
  - Back: romaji

When the user switches mode OR presses Next:
- The flash card must reset to **question side** (front), even if it was flipped previously.

### User Actions
- Tap card to flip.
- After flipping, show buttons:
  - **Wrong**
  - **Correct**
- Marking Correct/Wrong updates learning stats and auto-advances to the next question.
- Auto-advance should include subtle feedback:
  - Green flash on correct
  - Red flash on wrong
  - Duration ~200ms

### Swipe to Next with Animation
- Implement swipe gesture on the flashcard:
  - Card follows finger with translateX and a small rotate.
  - On release:
    - if dx exceeds threshold, card “flies out” then advances to next.
    - else snaps back.
- This should work on web and mobile.

### Drawing Pad Requirements
- Drawing pad must support mouse and touch.
- Use `react-native-svg`:
  - strokes are stored as SVG Path `d` strings.
- Provide tools:
  - **Undo** (remove last stroke)
  - **Redo** (restore)
  - **Clear**
- Fix the web issue where tapping disabled buttons creates strokes:
  - tool area must capture touches and prevent event fallthrough to PanResponder.
  - do NOT use `Pressable disabled` for undo/redo. Instead, no-op while keeping disabled style.

### Drawing Pad Grid (Practice Sheet)
- Add a light “田字” grid behind strokes:
  - border rectangle
  - center cross
  - quarter guide lines
- Must guard against invalid layout (avoid NaN paths):
  - only render the grid if width/height are > 1.

### Theme
- Light theme:
  - white background + light blue accents
  - card and drawing pad use light borders and subtle blue UI

### Progress Indicator
Display:
- `Session: X / 20`
- `Accuracy: Y%`
Session stats increment when user marks correct/wrong.

### Persistence
Persist learning stats locally:
- Use `@react-native-async-storage/async-storage`
- Store per-item stats:
  - correct count, wrong count, lastSeenAt
- On app start, load persisted deck stats if available, else build fresh from TSV.

### TSV Loading (Expo-safe)
- TSV is a local asset at `src/data/sample.tsv`.
- Implement loading via `expo-asset`:
  - `const tsvAsset = require("./src/data/sample.tsv")`
  - download with `Asset.fromModule(tsvAsset).downloadAsync()`
  - fetch `.localUri` to get the TSV string.

### Metro Config for .tsv
- Provide `metro.config.js` to add `"tsv"` to `resolver.assetExts` so bundling works on web.

---

## Output Requirements
Generate all code and files needed, step-by-step, including:

1. `metro.config.js`
2. `app.json` (only if needed; do not break Expo defaults)
3. `App.tsx`
4. `src/data/sample.tsv`
5. `src/logic/tsv.ts` (parse TSV)
6. `src/logic/srs.ts` (weighted random + applyResult)
7. `src/logic/storage.ts` (load/save deck)
8. `src/logic/loadTSV.ts` (expo-asset loader)
9. `src/components/FlashCard.tsx`
   - flip animation
   - allow forced reset by remount strategy (use `key` from parent)
10. `src/components/DrawingPad.tsx`
   - PanResponder stroke capture
   - grid overlay
   - undo/redo/clear
   - tool touch capture fix
11. Installation commands and run commands
12. GitHub Pages deploy steps:
   - `expo export -p web`
   - `gh-pages --nojekyll -d dist`
   - `publicPath` guidance for repo pages

Ensure the final app:
- Works on Expo web (`npx expo start --web`)
- Has working swipe animation and card flip
- Correct/Wrong auto-advance with flash feedback
- Drawing pad with grid + undo/redo that does not accidentally draw from tool taps
- Next always resets the card to question side

Do not omit any essential file content.