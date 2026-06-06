# Bodega Blitz - Asset Sources & Licenses

Required for hackathon submission. All shipped art is **CC0** unless noted.

Last updated: June 6, 2026

---

## Planned primary pack

| Field | Value |
|-------|-------|
| **Name** | Downtown City MegaKit |
| **Author** | Quaternius |
| **License** | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) |
| **Source** | https://quaternius.com |
| **Pipeline repo** | `mNithik/3d-to-2.5d-render` |
| **Attribution** | Not required |

MegaKit renders are produced offline as transparent 128 x 256 PNGs named
`renders/{frame_key}.png`, then packed into the shipped Phaser atlas.

`source.zip` is unverified and is not used or shipped.

---

## Interim / fallback pack

| Field | Value |
|-------|-------|
| **Name** | Isometric Miniature Prototype |
| **Author** | Kenney (www.kenney.nl) |
| **License** | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) |
| **Source** | https://kenney.nl/assets/isometric-miniature-prototype |
| **Mirror** | https://opengameart.org/content/isometric-miniature-prototype |
| **Download** | `Prototype Pack (2.3).zip` (OpenGameArt direct) |
| **Attribution** | Not required (appreciated) |

Kenney is the Phase 1 interim atlas and remains the fallback rebuild source
until the MegaKit render set is complete.

---

## Shipped atlas

| File | Description |
|------|-------------|
| `public/assets/game.png` | Texture atlas (17 frames, 128 x 256 px each) |
| `public/assets/game.json` | Phaser-compatible atlas JSON |

**Loader:**

```ts
this.load.atlas('game', 'assets/game.png', 'assets/game.json');
```

### Frame map

| Atlas key | Current source | MegaKit target | In-game use |
|-----------|----------------|----------------|-------------|
| `tile_street` | Kenney `Isometric/floor_E.png` | Road/asphalt tile | Street tile |
| `tile_bodega` | Kenney `Isometric/doorClosed_E.png` | Storefront facade | Bodega tile |
| `tile_alley` | Kenney `Isometric/block_E.png` | Alley wall or blocked corner | Alley tile |
| `tile_pickup_spawn` | Kenney `Isometric/switchFloorOff_E.png` | Floor decal | Optional pickup spawn marker |
| `token_red` | Kenney character | Carryover optional | Optional token sprite |
| `token_blue` | Kenney character | Carryover optional | Optional token sprite |
| `token_green` | Kenney character | Carryover optional | Optional token sprite |
| `token_yellow` | Kenney character | Carryover optional | Optional token sprite |
| `token_red_walk_0` | Kenney character | Carryover optional | Optional walk frame |
| `token_red_walk_1` | Kenney character | Carryover optional | Optional walk frame |
| `pickup_cash` | Kenney `Isometric/crate_E.png` | Register, coin, or cash icon | Cash pickup |
| `pickup_coffee` | Kenney `Isometric/poleGroup_E.png` | Coffee cup custom render | Coffee buff pickup |
| `pickup_shield` | Kenney `Isometric/fence_E.png` | Deli shutter or shield icon | Shield pickup |
| `fx_spill` | Kenney `Isometric/slopeHalf_E.png` | Ground slick decal | Spill overlay |
| `fx_shield` | Kenney `Isometric/switchFloorOn_E.png` | Protected tile glow | Shield overlay |
| `fx_speed` | Kenney `Isometric/arrow_E.png` | Arrow decal | Speed / contested overlay |
| `bodega_cat` | Kenney character with tint | Custom mascot optional | Flavor mascot |

Tokens intentionally remain colored circles in the Phaser scene for readability.

---

## Rebuilding the atlas

Dev-only tooling lives in `public/assets/_source/` and is not required at
runtime.

Kenney fallback:

1. Download `Prototype Pack (2.3).zip` into `public/assets/_source/kenney.zip`
2. `pip install pillow`
3. `python public/assets/_source/pack_atlas.py`

MegaKit renders:

1. Copy PNGs from the outer pipeline into `public/assets/_source/renders/`
2. Ensure required files are named `{frame_key}.png`
3. `python public/assets/_source/pack_atlas.py`

Outputs overwrite `public/assets/game.png` and `public/assets/game.json`.

---

## Audio

Not included in Dev D. Future CC0 candidates: Kenney impact/interface packs,
freesound.org (per-file license check).
