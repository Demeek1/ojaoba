# 🔤 One-Letter Word Duel

A fast two-player word puzzle game. Change **one letter** at a time to make a new word — and beat the shrinking clock.

## How to play

1. Open `index.html` in any web browser (double-click it — no install, no server needed).
2. Enter the two players' names.
3. Pick a **word length** (3, 4, or 5), a **difficulty** (how fast the clock shrinks), and a **match length** (how many rounds it takes to win).
4. Optionally type your own starting word, or leave it blank for a random one.
5. Click **Start Match**.

### Rules

- You're shown a word, e.g. **BOOK**.
- The active player must change **exactly one letter** to make a *new real word* of the **same length** — for example `BOOK → TOOK`.
- Play passes to the other player, who continues (`TOOK → COOK → COOL …`).
- You can't reuse a word already played this round.
- **The clock:** it starts at the difficulty's time and shrinks a little after every successful move, down to a floor of **5 seconds**.
- Run out of time and you **lose the round**. First player to reach the match target wins the **match** 🏆.

### Features

- **Scoreboard / match play** — play a series (single round, first to 3, or first to 5). The score is tracked across rounds, players alternate who starts each round, and there's a **Rematch** button.
- **Sound effects** — move confirmation, error buzz, countdown ticks in the last 3 seconds, and round/match win jingles. Toggle with the 🔊 button (top-right). All generated in-browser, no files, fully offline.
- **Difficulty levels** — pick how aggressively the clock shrinks:
  | Difficulty | Start time | Shrink per turn |
  |-----------|-----------|-----------------|
  | Chill  | 12s | −0.3s |
  | Normal | 10s | −0.5s |
  | Blitz  | 8s  | −0.75s |
  | Insane | 7s  | −1.0s |

  Every level bottoms out at the **5-second** floor.

## Play it online / share with others

See **[HOSTING.md](HOSTING.md)** for step-by-step ways to put the game on a public link so anyone can play — including a one-click GitHub Pages setup that's already wired up in this repo.

## Files

- `index.html` — the whole game (UI + logic + sound), self-contained.
- `words.js` — the built-in dictionary (~5,300 common 3-, 4-, and 5-letter words) used to validate moves. Fully offline.
- `HOSTING.md` — how to publish the game so others can play.

## Notes

Only words in `words.js` count as valid. It covers common English words so ladders are always possible; if a word you expect isn't accepted, it simply isn't in the built-in list.
