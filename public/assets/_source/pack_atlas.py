#!/usr/bin/env python3
"""Pack selected Kenney isometric frames into a Phaser texture atlas."""

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ZIP = ROOT / "_source" / "kenney.zip"
OUT_PNG = ROOT / "game.png"
OUT_JSON = ROOT / "game.json"

FRAME_W = 128
FRAME_H = 256
COLS = 6

FRAMES: dict[str, str] = {
    "tile_street": "Isometric/floor_E.png",
    "tile_bodega": "Isometric/doorClosed_E.png",
    "tile_alley": "Isometric/block_E.png",
    "tile_pickup_spawn": "Isometric/switchFloorOff_E.png",
    "token_red": "Characters/Human/Human_0_Idle0.png",
    "token_blue": "Characters/Human/Human_1_Idle0.png",
    "token_green": "Characters/Human/Human_2_Idle0.png",
    "token_yellow": "Characters/Human/Human_3_Idle0.png",
    "token_red_walk_0": "Characters/Human/Human_0_Run0.png",
    "token_red_walk_1": "Characters/Human/Human_0_Run1.png",
    "pickup_cash": "Isometric/crate_E.png",
    "pickup_coffee": "Isometric/poleGroup_E.png",
    "pickup_shield": "Isometric/fence_E.png",
    "fx_spill": "Isometric/slopeHalf_E.png",
    "fx_shield": "Isometric/switchFloorOn_E.png",
    "fx_speed": "Isometric/arrow_E.png",
    "bodega_cat": "Characters/Human/Human_0_Idle0.png",
}


def load_image(zf: zipfile.ZipFile, path: str) -> Image.Image:
    data = zf.read(path)
    return Image.open(io.BytesIO(data)).convert("RGBA")


def tint_orange(img: Image.Image) -> Image.Image:
    tinted = img.copy()
    r, g, b, a = tinted.split()
    base = Image.merge("RGB", (r, g, b))
    warm = ImageEnhance.Color(base).enhance(1.6)
    warm = ImageEnhance.Contrast(warm).enhance(1.1)
    wr, wg, wb = warm.split()
    return Image.merge("RGBA", (wr, wg, wb, a))


def main() -> None:
    if not SOURCE_ZIP.exists():
        raise SystemExit(
            f"Missing {SOURCE_ZIP}. Download Kenney Isometric Miniature Prototype (CC0) first."
        )

    keys = list(FRAMES.keys())
    rows = (len(keys) + COLS - 1) // COLS
    atlas_w = COLS * FRAME_W
    atlas_h = rows * FRAME_H
    atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    phaser_frames: dict[str, dict] = {}

    with zipfile.ZipFile(SOURCE_ZIP) as zf:
        for index, key in enumerate(keys):
            img = load_image(zf, FRAMES[key])
            if key == "bodega_cat":
                img = tint_orange(img)
            img = img.resize((FRAME_W, FRAME_H), Image.Resampling.LANCZOS)

            x = (index % COLS) * FRAME_W
            y = (index // COLS) * FRAME_H
            atlas.paste(img, (x, y), img)

            phaser_frames[key] = {
                "frame": {"x": x, "y": y, "w": FRAME_W, "h": FRAME_H},
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {"x": 0, "y": 0, "w": FRAME_W, "h": FRAME_H},
                "sourceSize": {"w": FRAME_W, "h": FRAME_H},
            }

    atlas.save(OUT_PNG, optimize=True)
    OUT_JSON.write_text(
        json.dumps(
            {
                "frames": phaser_frames,
                "meta": {
                    "app": "pack_atlas.py",
                    "version": "1.0",
                    "image": "game.png",
                    "format": "RGBA8888",
                    "size": {"w": atlas_w, "h": atlas_h},
                    "scale": "1",
                },
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Packed {len(keys)} frames -> {OUT_PNG.name}, {OUT_JSON.name}")


if __name__ == "__main__":
    main()
