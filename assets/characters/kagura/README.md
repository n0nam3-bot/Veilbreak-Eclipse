# Kagura — supplied character pack

Integrated into Veilbreak: Eclipse as the first selectable character and default Player 1 fighter.

## Included files

- `portrait.jpg` — character portrait used in character selection.
- `animations/idle.png` — 4 × 3 sheet, 256 × 256 frame cells.
- `animations/walk.png` — 4 × 2 sheet, 256 × 256 frame cells.
- `animations/dash.png` — 5 × 4 sheet, 256 × 256 frame cells.
- `animations/jump.png` — 5 × 3 sheet, 256 × 256 frame cells.
- `animations/twin-stab.png` — 4 × 4 sheet, 512 × 512 frame cells.
- `animations/blade-flurry.png` — 4 × 4 sheet, 512 × 512 frame cells.

The game crops animation frames directly from the supplied sheets at runtime. The original images are preserved without recoloring or editing.

## Current integration notes

Kagura uses her supplied idle, walk, dash, jump, twin-stab, and blade-flurry animation sheets during matches, including the assist renderer when she is selected as a partner. The supplied sheets are flattened images; they do not contain independently editable armor/body layers. The armor meter and combat logic continue to work, but accurate per-piece visual removal requires matching separated armor and under-suit artwork for Kagura. No mismatched replacement outfit is painted over her art.
