# 🔤 One-Letter Word Duel

A fast two-player word puzzle game. Change **one letter** at a time to make a new word — and beat the shrinking clock.

## How to play

1. Open `index.html` in any web browser (double-click it — no install, no server needed).
2. Enter the two players' names and pick a word length (3, 4, or 5 letters).
3. Optionally type your own starting word, or leave it blank for a random one.
4. Click **Start Duel**.

### Rules

- You're shown a word, e.g. **BOOK**.
- The active player must change **exactly one letter** to make a *new real word* of the **same length** — for example `BOOK → TOOK`.
- Play then passes to the other player, who continues from the new word (`TOOK → COOK → COOL …`).
- You can't reuse a word that has already been played this round.
- **The clock:** you start with **10 seconds** per turn. After every successful move the time limit shrinks by 0.5s, down to a floor of **5 seconds**.
- The first player who fails to enter a valid word before the timer hits zero **loses**.

## Files

- `index.html` — the whole game (UI + logic), self-contained.
- `words.js` — the built-in dictionary (~5,300 common 3-, 4-, and 5-letter words) used to validate moves. Fully offline.

## Notes

Only words in `words.js` count as valid. It covers common English words so ladders are always possible; if a word you expect isn't accepted, it simply isn't in the built-in list.
