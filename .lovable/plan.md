

# Integrate Thirukkural JSON Data

## What we have
The uploaded JSON contains all 1330 kurals with fields: `kuralno`, `Kural` (Tamil text), `Adikaram` (chapter), `pirivu` (section), and `audiolink` (MP3 URL from cdn.abiramiaudio.com).

## Plan

### 1. Copy JSON to project
Copy `formatted_test.json` to `src/data/kurals.json`.

### 2. Update data layer (`src/data/sample-kurals.ts`)
- Import the full JSON file
- Update the `Kural` interface to match JSON fields (`kuralno`, `Kural`, `Adikaram`, `pirivu`, `audiolink`)
- Rewrite `getKural()` to look up from the full 1330-kural dataset
- Map JSON fields to the existing interface used by components (tamil, chapter, section, audioUrl)

### 3. Update KuralPlayer component
- Ensure the audio player uses the `audiolink` URL from the JSON data
- The player already supports `audioUrl` — just needs the data mapping to work

No other page changes needed — the keypad, subscription, and routing already work correctly.

