# Evolution Arena multiplayer server

An authoritative game server. It loads the game's own script (`../index.html`) in a sandbox and runs it
headlessly, so bots, bosses, hazards and world events behave exactly as in single-player. Browsers send
their inputs and receive snapshots; they never run the match themselves, so cheating by editing the page
does not give an advantage.

```bash
cd server
npm install
npm start            # http://localhost:8080  (game + server on one address)
```
Open `http://localhost:8080/` in two browser tabs and press **Online Arena** in each.

| Setting | How | Default |
|---|---|---|
| Port | `PORT` env var | 8080 |
| Max players | `MAX_PLAYERS` env var | 30 |

`GET /health` returns player and creature counts. The server tops the arena up to 100 creatures with bots,
so a lone player still gets a full match, and bots leave as more people join.

## Deploying
- **Render (free):** connect the repo, it picks up `render.yaml`. Open `https://<your-app>.onrender.com/` to play, or
  host the page elsewhere (for example GitHub Pages) and enter `wss://<your-app>.onrender.com` under
  Settings > Multiplayer server. Free instances sleep when idle, so the first connection can take about a minute.
- **Docker:** `docker build -t evolution-arena . && docker run -p 8080:8080 evolution-arena`
- Any host that can run Node 18+ and keep a WebSocket open works. Use `wss://` when the page is served over https.

## How it works
- `server.js`: HTTP + WebSocket, 30 ticks per second, snapshots at 15 per second, one snapshot per player containing
  only what is near them (creatures, food cells that changed, projectiles, hazards).
- `glue.js`: runs inside the sandbox. Swaps visual and sound calls for network events and exposes join, input,
  ability, tick and snapshot functions.
- Protocol (JSON): client sends `join`, `in` (move vector and aim), `ab` (ability), `em` (emote), `leave`;
  server sends `w` (welcome), `s` (snapshot), `dead` (result), `full`.
