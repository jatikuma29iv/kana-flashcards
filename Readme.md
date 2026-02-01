# Kana Flashcards (React Native + Web)

A lightweight flashcard + handwriting practice app built with **Expo (React Native + Web)**.

The app loads a **3-column TSV** deck (`romaji`, `hiragana`, `katakana`), quizzes using a **mistake-adaptive weighted random algorithm**, and provides a **handwriting practice pad** with a light Japanese practice grid (田字), undo/redo, and swipe gestures.

---

## Features

### Flashcards
- Two quiz modes:
  - **R2K**: Romaji → Kana
  - **K2R**: Kana → Romaji
- Random Hiragana or Katakana per question
- Flip card to reveal answer
- Mark **Correct / Wrong**
- Auto-advance with subtle feedback:
  - Green flash = correct
  - Red flash = wrong
- Swipe left/right to move to next card with animation
- “Next” button always resets card to question side

### Learning Logic
- Items marked wrong appear more frequently
- Weighted random selection based on:
  - Wrong count
  - Correct count
  - Time since last seen
- Progress is persisted locally

### Drawing Pad
- Full-screen handwriting area
- Light theme with blue accents
- Japanese practice grid (田字)
- Undo / Redo strokes
- Clear canvas
- Touch-safe tools (no accidental strokes)

### Progress Tracking
- Session progress (e.g. `7 / 20`)
- Accuracy percentage
- Optional per-mode statistics

---

## Project Structure

```
.
├─ App.tsx
├─ metro.config.js
├─ app.json
├─ src/
│  ├─ components/
│  │  ├─ FlashCard.tsx
│  │  └─ DrawingPad.tsx
│  ├─ logic/
│  │  ├─ tsv.ts
│  │  ├─ srs.ts
│  │  ├─ storage.ts
│  │  └─ loadTSV.ts
│  └─ data/
│     └─ sample.tsv
```

---

## Setup & Installation

### Prerequisites
- Node.js ≥ 18
- npm or yarn
- GitHub account (for Pages hosting)

### 1. Clone the repository
```bash
git clone https://github.com/<username>/<repo-name>.git
cd <repo-name>
```

### 2. Install dependencies
```bash
npm install
```
or
```bash
yarn install
```

### 3. Run locally (Web)
```bash
npx expo start --web
```

---

## TSV Asset Support (Required)

This app loads flashcards from a `.tsv` file.

Ensure **Metro** supports `.tsv` assets.

### metro.config.js
```js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("tsv");

module.exports = config;
```

Restart Expo after changes:
```bash
npx expo start -c
```

---

## TSV Format

Each line:
```
romaji<TAB>hiragana<TAB>katakana
```

Example:
```
shi	し	シ
tsu	つ	ツ
```

---

## Deployment to GitHub Pages

### 1. Install gh-pages
```bash
npm install --save-dev gh-pages
```

### 2. Add scripts to package.json
```json
{
  "scripts": {
    "predeploy": "expo export -p web",
    "deploy": "gh-pages --nojekyll -d dist"
  }
}
```

### 3. Configure publicPath

If deploying to:
```
https://<username>.github.io/<repo-name>/
```

Add to `app.json`:
```json
{
  "expo": {
    "web": {
      "publicPath": "/<repo-name>/"
    }
  }
}
```

If repo is named `<username>.github.io`, use:
```json
"publicPath": "/"
```

### 4. Deploy
```bash
npm run deploy
```

### 5. Enable GitHub Pages
- Repository → Settings → Pages
- Source: `gh-pages` branch
- Folder: `/ (root)`

Your app will be live at:
```
https://<username>.github.io/<repo-name>/
```

---

## Common Issues

- Blank page → check `publicPath`
- 404 assets → ensure `--nojekyll`
- TSV not loading → check metro.config.js
- Old build showing → hard refresh browser

