# Changelog

## 1.3.0 - 2026-04-16

### Added
- **Button role classes** — Every action button now gets a semantic CSS class: `msgt-btn--back`, `msgt-btn--skip`, `msgt-btn--next`. Allows precise per-button styling without fragile `:nth-child` selectors.
- **`buttonOrder`** — New `actions.buttonOrder` option (meta & step level). Accepts an ordered array of `["skip", "back", "next"]` to control the visual order of action buttons. When set, buttons render in the specified sequence instead of the default primary-last ordering.
- **Button font CSS variables** — Two new CSS custom properties on `.msgt-tooltip`:
  - `--msgt-btn-font-weight` (default: `600`) — controls button font weight.
  - `--msgt-btn-font-family` (default: `inherit`) — controls button font family.
  - Also exposed via `GuideTheme` as `buttonFontWeight` and `buttonFontFamily`.
- **`targetInteractive`** — New step-level boolean option. Set `targetInteractive: false` to add `pointer-events: none` to the spotlight target via `msgt-guide-target-inactive` class. Useful for "look but don't touch" steps (e.g. showing a filter dropdown without allowing changes).
- **`targetAttention`** — New step-level option to draw user attention to the target element. Adds a CSS animation class to the spotlighted target. Values:
  - `"none"` — no animation (default).
  - `"pulse"` — subtle scale pulse (`msgt-guide-target-attention-pulse`).
  - `"border-pulse"` — border-only pulse without center circle (`msgt-guide-target-attention-border-pulse`).
  - `"bounce"` — vertical bounce (`msgt-guide-target-attention-bounce`).
  - `"glow"` — blue box-shadow glow (`msgt-guide-target-attention-glow`).
  - Parser also accepts aliases: `"throb"` → pulse, `"jump"` → bounce, `"shine"` → glow, `"borderpulse"` → border-pulse.
- **`tooltipOffsetX` and `tooltipOffsetY`** — New meta/step options to shift tooltip position after placement resolution (`top/right/bottom/left/auto`).
- **Skip tour control** — Added `actions.showSkipTour` and `i18n.skipTourButtonLabel` for a dedicated "Skip tour" action independent from per-step skip behavior.
- **Theme token expansion** — Added title, description, button and disabled-state theme tokens (font family/size/weight, radius, spacing, ghost hover, disabled colors).
- **Highlight ring fill layer** — Added `msgt-highlight-fill` overlay with even-odd clip-path support for padding-fill scenarios.
- Exported `GUIDE_TARGET_ATTENTIONS` constant and `GuideTargetAttention` type.

### Changed
- `.msgt-btn` now uses `var(--msgt-btn-font-weight)` and `var(--msgt-btn-font-family)` instead of hardcoded `font-weight: 600`.
- `.msgt-btn` sizing and disabled styles now use dedicated CSS variables (`--msgt-btn-font-size`, paddings, radius, disabled bg/text/border).
- `advanceOn: "click"` and `advanceOn: "change"` steps with explicit `actions.showNext: true` no longer auto-advance; requirements now enable the Next button instead.
- `clearActiveTargets` cleanup now also removes `msgt-guide-target-inactive` and all attention animation classes.

### Fixed
- Action merging now ignores `undefined` values from step-level actions so meta-level values are preserved (for example `showSkipTour` no longer gets unintentionally reset).
- Close button is automatically hidden when `showSkipTour` is active to avoid duplicate dismiss actions.

## 1.2.2 - 2026-04-15

### Added
- `overlayLock` option at meta and step level — locks overlay so nothing behind is clickable except spotlight targets.
- `showFollowHint` option at meta and step level — hides "Follow the highlighted target" message.
- `stepPillPosition` option (`"top"` | `"title"` | `"bottom"`) — controls where step progress pill renders.

### Changed
- Default step pill colors changed to DFDS blue (`#002B45`) background with white text.
- Removed "yellow" from `clickHighlightedMessage` default text.
- Bumped `.msgt-guide-target-active` z-index to `2147483001`.
- Title-row pills (position `"title"`) now use smaller font (`10px`) and tighter padding.

### Fixed
- Title-row pill layout uses reduced gap (`8px` row, `4px` between pills).

## 1.2.1 - 2026-04-07

## 1.1.3 - 2026-03-12

### Fixed
- Publishes the verified `Next` button runtime fix so `actions.showNext: true` works for `advanceOn: "auto"` steps in the editor and app runtime.
- Keeps the headerless tooltip title alignment fix in the published tarball.

## 1.1.2 - 2026-03-12

### Fixed
- Republishes the tooltip layout and `Next` button fixes that were intended for `1.1.1` but were not present in the published npm tarball.
- Headerless tooltips keep the title aligned higher, without leaving an empty spacer row.
- `Next` remains visible when footer actions enable it, including the editor and example runtime previews.

## 1.1.1 - 2026-03-12

### Fixed
- Tooltip titles now sit higher when header pills are hidden, so the content no longer feels pushed down by an empty header row.
- `Next` is visible again in the example tooltip flows, including steps that also support click/change/input-driven advancement.

### Updated
- Example app package pin is prepared for `1.1.1` manual upgrades.

## 1.1.0 - 2026-03-11

### Added
- Optional `pills` configuration at guide and step level to hide the progress pill, hide the kind pill, or mix them per step.
- Optional `actions` configuration at guide and step level to hide close/back/next/skip controls and choose which footer action is primary.
- New pill theme tokens: `pillFontSize`, `pillFontWeight`, `pillLetterSpacing`, and `pillTextTransform`.
- Example app demos for 1.1.0 UI controls, including hidden pills, softer kind tags, and primary action overrides.

### Updated
- Active-step dismiss is now rendered as a compact header control instead of competing with footer actions.
- Footer actions now emphasize a single primary action by default, with `Next` preferred for manual steps.
- Example app dependency flow is prepared for manual version pinning instead of automatic local workspace updates.

## 0.1.2 - 2026-03-08

### Added
- `MarkdownGuideTrigger` for flexible guide start behavior with `click`, `hover`, and `focus` triggers.
- Manual trigger support via render-function children using `startGuide()` for custom app event flows.
- Agent-friendly integration section in `GUIDE_MD_STANDARD.md` with:
  - deterministic integration checklist,
  - machine-readable integration contract JSON,
  - decision rules for trigger strategy,
  - reusable prompt template for coding agents.

### Updated
- Public exports now include `MarkdownGuideTrigger` and related trigger types.
- Documentation updated across `README.md`, `GUIDE_MD_STANDARD.md`, and `TOOL_FEATURES_GUIDE.md`.
