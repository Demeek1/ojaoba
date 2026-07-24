# Where can people play the game? 🌍

The game is a single static web page (`index.html` + `words.js`), so it's very easy to put online. Here are your options, easiest first.

---

## Option 1 — GitHub Pages (recommended, free, already set up)

This repo already includes a workflow (`.github/workflows/deploy-word-game.yml`) that publishes the game automatically. You just need to turn Pages on once.

1. Get this branch merged into `master` (open a Pull Request for `claude/word-puzzle-game-06ql8c` and merge it), **or** run the workflow manually — see step 3.
2. In your repository on GitHub, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. The "Deploy Word Duel to GitHub Pages" workflow runs automatically on pushes to `master`. To run it right now without waiting, open the **Actions** tab → **Deploy Word Duel to GitHub Pages** → **Run workflow**.
5. After it finishes (green check), your game is live at:

   ```
   https://demeek1.github.io/ojaoba/
   ```

   Share that link with anyone — it works on phones and computers, no install needed.

> Two players play on the **same device**, taking turns typing on the keyboard. (This is a local pass-and-play game — see "About online multiplayer" below.)

---

## Option 2 — Netlify Drop (no GitHub, no account needed to start)

Fastest way to get a public link in under a minute:

1. Go to **https://app.netlify.com/drop**.
2. Drag the whole `word-puzzle-game` folder onto the page.
3. Netlify instantly gives you a public URL like `https://random-name-123.netlify.app` you can share.
4. (Optional) Create a free account to keep the link and rename it.

**Vercel** (https://vercel.com) and **Cloudflare Pages** (https://pages.cloudflare.com) work the same way and are also free.

---

## Option 3 — Just send the files

Because it's fully offline, you can also:

- **Zip the `word-puzzle-game` folder** and send it to friends. They unzip it and double-click `index.html`.
- Keep both files together (`index.html` **and** `words.js` must be in the same folder).

---

## About online multiplayer (two different devices)

Right now this is **pass-and-play**: both players share one screen and take turns. That's simple, reliable, and needs no server.

If you'd like players to duel from **separate devices over the internet** (each on their own phone), that needs a small real-time backend (e.g. WebSockets with rooms/codes). It's a bigger feature — if you want it, just say the word and I can build it as a next step.
