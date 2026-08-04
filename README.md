# BLACKSITE: FRONTLINE DESCENT

An original first-person science-fiction operation sandbox built with React, TypeScript, Three.js, and Vite. The current release is a focused Forge City vertical slice: deploy from the ASC Valiant, cross an independently populated battlefield, dismantle an Iron Choir command uplink, and physically extract.

## Vertical slice

- Carrier deployment terminal with armor and insertion selection
- 420 m Forge City operation region with authored industrial sites, POIs, outposts, roads, cover, and negative space
- Independent patrols with vision cones, line-of-sight, hearing, investigation, local knowledge, and avoidance opportunities
- Four Iron Choir combat roles: Legion Rifleman, Rocket Legionary, Bulwark Gunner, and Red Reaper, plus the heavy Forge Enforcer
- Interruptible reinforcement flare and physical dropship approach, hover, troop drop, departure, damage, and crash behavior
- Destructible production structures that create units until destroyed
- Multi-step uplink objective: destroy fabricator, reroute power, sever relays, and purge command lattice
- POI rewards including carried samples and a recoverable anti-armor launcher
- Sixteen defined Command Support systems; the slice equips Kinetic Lance, Supply Capsule, Rook VTOL, and Autocannon Sentry
- Physical thrown support beacons, arrivals, danger zones, and player-damaging friendly fire
- Tactical magazine discard, chambered rounds, stance/movement accuracy, recoil, armor penetration, component damage, stamina, injuries, and armor weight
- Extraction authorization code, converging field forces, physical shuttle landing, boarding, departure, and operation report

This is a solo MVP. Systems use a four-operator squad ceiling, but the project does not claim online multiplayer.

## Controls

| Action | Input |
| --- | --- |
| Move / look | `WASD` / mouse |
| Fire / ADS | Mouse 1 / Mouse 2 |
| Sprint | `Shift` |
| Crouch / prone | `Ctrl` / `Z` |
| Vault / contextual jump | `Space` |
| Combat dive | `Alt` |
| Interact | `E` |
| Reload | `R` |
| Med-injector | `X` |
| Command Support | Hold `Q`, then enter the shown WASD sequence |
| Tactical map | `M` |
| Weapon slots | `1`, `2`, `3` or mouse wheel |

## Run and verify

```bash
npm install
npm run dev
npm run lint
npm run build
npx tsx scripts/gameplay_checks.ts
```

The development server runs at `http://localhost:3000`.

## Assets and licensing

Runtime 3D assets are local—there are no model hotlinks. Environment and weapon modules come from Kenney's CC0 Space Station and Blaster kits. The animated robot base is Tomás Laulhé's CC0 RobotExpressive model, with Don McCurdy's modifications. Every runtime model and dependent texture is recorded in [`src/game/assets/asset-manifest.json`](src/game/assets/asset-manifest.json); the original Kenney license files are stored beside the runtime assets.

No Helldivers names, insignia, models, icons, UI, characters, or extracted game assets are used.
