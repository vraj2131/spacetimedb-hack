# Bodega Blitz - Asset Sources & Licenses

Required for hackathon submission. All shipped art is **CC0** unless noted.

Last updated: June 6, 2026

---

## Shipped primary pack

| Field | Value |
|-------|-------|
| **Name** | Downtown City MegaKit |
| **Author** | Quaternius |
| **License** | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) |
| **Source** | https://quaternius.com |
| **Pipeline repo** | `mNithik/3d-to-2.5d-render` |
| **Attribution** | Not required |

MegaKit is the shipped first-swap art source for the required board frames.
The outer pipeline repo renders selected FBX files offline as transparent
128 x 256 PNGs named `renders/{frame_key}.png`, then the game repo packs them
into the shipped Phaser atlas.

`source.zip` is unverified and is not used or shipped.

### Shipped MegaKit frame selections

| Atlas key | MegaKit asset |
|-----------|---------------|
| `tile_street` | `Exports/FBX (Unity)/Street_Asphalt_6x6.fbx` |
| `tile_bodega` | `Exports/FBX (Unity)/Building_Small_1.fbx` |
| `tile_alley` | `Exports/FBX (Unity)/Brick_Corner_Plain.fbx` |
| `pickup_cash` | `Exports/FBX (Unity)/Prop_ManholeCover.fbx` |
| `pickup_coffee` | `Exports/FBX (Unity)/Prop_Planter_Single.fbx` |
| `pickup_shield` | `Exports/FBX (Unity)/Prop_Bollard.fbx` |
| `fx_spill` | `Exports/FBX (Unity)/Prop_Drain.fbx` |
| `fx_shield` | `Exports/FBX (Unity)/Sidewalk_Planter.fbx` |
| `fx_speed` | `Exports/FBX (Unity)/Decal_ArrowStraight.fbx` |

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

Kenney remains a rebuild fallback and provides optional carryover frames for
this first MegaKit swap, such as tokens, `tile_pickup_spawn`, and `bodega_cat`.

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
| `tile_street` | MegaKit render | Street/asphalt tile | Street tile |
| `tile_bodega` | MegaKit render | Small storefront building | Bodega tile |
| `tile_alley` | MegaKit render | Brick corner block | Alley tile |
| `tile_pickup_spawn` | Kenney carryover | Floor decal | Optional pickup spawn marker |
| `token_red` | Kenney carryover | Carryover optional | Optional token sprite |
| `token_blue` | Kenney carryover | Carryover optional | Optional token sprite |
| `token_green` | Kenney carryover | Carryover optional | Optional token sprite |
| `token_yellow` | Kenney carryover | Carryover optional | Optional token sprite |
| `token_red_walk_0` | Kenney carryover | Carryover optional | Optional walk frame |
| `token_red_walk_1` | Kenney carryover | Carryover optional | Optional walk frame |
| `pickup_cash` | MegaKit render | Manhole cover prop | Cash pickup |
| `pickup_coffee` | MegaKit render | Planter prop | Coffee buff pickup |
| `pickup_shield` | MegaKit render | Bollard prop | Shield pickup |
| `fx_spill` | MegaKit render | Drain prop | Spill overlay |
| `fx_shield` | MegaKit render | Sidewalk planter prop | Shield overlay |
| `fx_speed` | MegaKit render | Straight arrow decal | Speed / contested overlay |
| `bodega_cat` | Kenney carryover | Custom mascot optional | Flavor mascot |

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
