# Evolution Arena

A browser game. Hatch as an egg, eat, and evolve through 12 creatures (Egg, Ant, Mouse, Rat, Rabbit, Fox, Wolf, Tiger, Bear, Dragon, Phoenix, Titan). Each evolution adds speed, health and one active ability. Fight rivals and world bosses, collect DNA and coins, and unlock cosmetics.

## Play
Open `index.html` in a browser. No build step and no dependencies. To host it, enable GitHub Pages for this repo.

## Modes
Tutorial (played automatically the first time), Solo Survival, 100-Player Arena, Team vs Team, Boss Rush, Weekly Tournament.

## Controls
| Action | Keys |
|---|---|
| Move | W A S D / arrows, or hold the mouse (touch: drag) |
| Use ability | Space, right-click, or the ⚡ button |
| Pick ability | 1-9, 0, -, = |
| Emotes | Z X C V |
| Pause | Esc |

## Multiplayer
Press **Online Arena** to play against other people on a shared server (bots fill the empty slots). It needs the Node server in `server/`:
```bash
cd server && npm install && npm start   # then open http://localhost:8080/ in two tabs
```
See `server/README.md` for deploying it (Render config included) and for how it works. If the page is hosted somewhere else, enter the server address under Settings.

## Bosses, hazards and events
Ten world bosses, each with its own attacks: Forest Guardian, Ice Mammoth, Sea Serpent, Lava Dragon, Shadow Titan, Swamp Hydra, Thunder Roc, Magma Golem, Abyssal Kraken, Void Devourer. Boss Rush runs all ten.
Map hazards: thorn patches, ice slicks, geysers, lava vents and healing springs. Every 70-100 seconds a world event hits (lightning storm, meteor shower, blizzard).

## Notes
Progress saves in the browser. Outside the Online Arena there is no server, so rivals, clans, friends and leaderboards are simulated locally, and the revive ad is a placeholder.
