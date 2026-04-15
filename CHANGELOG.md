# Changelog

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
