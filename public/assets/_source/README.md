# Dev-only atlas rebuild files

Do not commit zips, extracted models, or copied renders. See root `ASSETS.md`
for source licenses.

- `pack_atlas.py` - packs selected frames into `../game.png` and `../game.json`
- `kenney.zip` - local download of Kenney Isometric Miniature Prototype (CC0)
- `renders/{frame_key}.png` - copied MegaKit render PNG inputs from the outer
  `3d-2.5d-render` pipeline

Run the packer from the game repo root:

```powershell
python public/assets/_source/pack_atlas.py
```

When all required render PNGs are present, the packer uses those. Otherwise it
falls back to `kenney.zip`.

If the required render PNGs are present and `kenney.zip` is absent, optional
carryover frames are cropped from the existing committed `game.png` /
`game.json` atlas.
