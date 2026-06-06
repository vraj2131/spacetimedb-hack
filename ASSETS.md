# Bodega Blitz — Asset Sources & Licenses

Required for hackathon submission. All shipped art is **CC0** unless noted.

Last updated: June 6, 2026

---

## Primary pack

| Field | Value |
|-------|-------|
| **Name** | Isometric Miniature Prototype |
| **Author** | Kenney (www.kenney.nl) |
| **License** | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) |
| **Source** | https://kenney.nl/assets/isometric-miniature-prototype |
| **Mirror** | https://opengameart.org/content/isometric-miniature-prototype |
| **Download** | `Prototype Pack (2.3).zip` (OpenGameArt direct) |
| **Attribution** | Not required (appreciated) |

Kenney assets may be used in commercial and non-commercial projects without permission.

---

## Shipped atlas

| File | Description |
|------|-------------|
| `public/assets/game.png` | Texture atlas (17 frames, 128×256 px each) |
| `public/assets/game.json` | Phaser-compatible atlas JSON |

**Loader (Slice 8):**

```ts
this.load.atlas('game', 'assets/game.png', 'assets/game.json');
```

### Frame map (17 frames)

| Atlas key | Kenney source (inside zip) | In-game use |
|-----------|---------------------------|-------------|
| `tile_street` | `Isometric/floor_E.png` | Street tile (common, low value) |
| `tile_bodega` | `Isometric/doorClosed_E.png` | Bodega / deli storefront tile |
| `tile_alley` | `Isometric/block_E.png` | Blocked alley tile |
| `tile_pickup_spawn` | `Isometric/switchFloorOff_E.png` | Pickup spawn marker |
| `token_red` | `Characters/Human/Human_0_Idle0.png` | Player token (red) |
| `token_blue` | `Characters/Human/Human_1_Idle0.png` | Player token (blue) |
| `token_green` | `Characters/Human/Human_2_Idle0.png` | Player token (green) |
| `token_yellow` | `Characters/Human/Human_3_Idle0.png` | Player token (yellow) |
| `token_red_walk_0` | `Characters/Human/Human_0_Run0.png` | Walk animation frame 0 |
| `token_red_walk_1` | `Characters/Human/Human_0_Run1.png` | Walk animation frame 1 |
| `pickup_cash` | `Isometric/crate_E.png` | Cash pickup |
| `pickup_coffee` | `Isometric/poleGroup_E.png` | Coffee buff pickup |
| `pickup_shield` | `Isometric/fence_E.png` | Shield / deli shutter pickup |
| `fx_spill` | `Isometric/slopeHalf_E.png` | Spill slick overlay |
| `fx_shield` | `Isometric/switchFloorOn_E.png` | Shield glow overlay |
| `fx_speed` | `Isometric/arrow_E.png` | Speed boost overlay |
| `bodega_cat` | `Characters/Human/Human_0_Idle0.png` (orange tint) | Taunt bubble mascot (stand-in) |

All frames use the **east-facing (`_E`)** isometric variant for consistency. Source tiles are 256×512 px; atlas scales to **128×256** for reasonable load size.

> **Note:** `bodega_cat` is a tinted character stand-in until custom cat art lands. Gameplay does not depend on it.

---

## Rebuilding the atlas

Dev-only tooling lives in `public/assets/_source/` (not required at runtime).

1. Download `Prototype Pack (2.3).zip` into `public/assets/_source/kenney.zip`
2. `pip install pillow`
3. `python public/assets/_source/pack_atlas.py`

Outputs overwrite `public/assets/game.png` and `public/assets/game.json`.

---

## Audio

Not included in Dev D. Future CC0 candidates: Kenney impact/interface packs, freesound.org (per-file license check).
