# RotaGuide Spotlight — Complete Feature Guide

This document is a full reference for all currently supported features in `RotaGuide Spotlight`.
Guide source formats: markdown, JSON, YAML.
Guide UI customization: i18n text + theme colors/fonts.

## 1. Quick Start

```tsx
import { MarkdownGuideButton, guideTarget } from "rotaguide-spotlight";
import "rotaguide-spotlight/style.css";
import guideContent from "./feature-tour.guide.md?raw";

export function Page() {
  return (
    <div>
      <button {...guideTarget("open-create")}>Open</button>
      <input {...guideTarget("customer-name")} />

      <MarkdownGuideButton content={guideContent} format="auto" />
    </div>
  );
}
```

`guideTarget("x")` is a helper for `data-click-guide="x"`.

### Custom trigger start (wrapper + events)

```tsx
import { MarkdownGuideTrigger } from "rotaguide-spotlight";

<MarkdownGuideTrigger content={guideContent} triggerOn={["hover", "focus"]} as="div">
  <section className="tour-card">Hover or focus this card to start guide</section>
</MarkdownGuideTrigger>

<MarkdownGuideTrigger content={guideContent}>
  {({ startGuide, triggerProps }) => (
    <button
      type="button"
      {...triggerProps}
      onClick={() => {
        // custom click logic
        startGuide();
      }}
    >
      Start with custom onClick
    </button>
  )}
</MarkdownGuideTrigger>
```

### Release notes with feature guides

`FeatureReleaseNotes` opens a one-time change log popup for a release. Entries can be informational only, or they can launch only the guide steps that match their `featureIds`, `tags`, or `stepIds`.

```tsx
import { FeatureReleaseNotes } from "rotaguide-spotlight";
import { Activity, Sparkles } from "lucide-react";

<FeatureReleaseNotes
  id="release-2026-06-vessel-signals"
  title="What's new"
  eyebrow="Pulse update"
  headerIcon={<Sparkles aria-hidden="true" />}
  content={guideContent}
  items={[
    {
      id: "progress",
      title: "Overall Milestone Progress",
      description: "See vessel progress directly on the tile.",
      icon: <Activity aria-hidden="true" />,
      accentColor: "#1A63F5",
      accentBackgroundColor: "#D1EBFF",
      featureIds: "vessel-tile-progress",
      required: true,
    },
    {
      id: "exceptions",
      title: "Operational Exception Indicator",
      description: "Open only the steps that explain the exception symbol.",
      featureIds: "vessel-operational-exceptions",
    },
  ]}
/>
```

Use a new `id` for every new release. Use `storageKey` when the dismissed state should be scoped to a specific user or tenant.
Use `headerIcon`, item `icon`, `accentColor`, and `accentBackgroundColor` when the popup should visually match your product theme.

## 2. Markdown Structure

Your markdown can include optional frontmatter, then one or more step sections.

````md
---
id: feature-tour
title: Feature Tour
buttonLabel: Start Tour
tooltipTitle: Tour completed
overlayColor: "rgba(0, 43, 69, 0.22)"
highlightColor: "rgb(255, 199, 0)"
highlightStyle: line
highlightAnimation: none
tooltipWidth: 420
tooltipTemplate: glass
showHighlight: true
draggable: true
---

## Step: Open Form
```yaml
id: open-create
target: open-create
kind: Action
title: Open form
description: Click Open to continue.
```
````

## 3. Frontmatter Fields

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | `string` | No | `"guide"` | Guide identifier |
| `title` | `string` | Yes | - | Missing value causes validation error |
| `buttonLabel` | `string` | No | `"Start Guide"` | Used by `MarkdownGuideButton` |
| `tooltipTitle` | `string` | No | `${title} completed` | Final step title |
| `tooltipPlacement` | `auto \| top \| right \| bottom \| left` | No | `auto` | Preferred tooltip side |
| `tooltipPosition` | `auto \| top \| right \| bottom \| left` | No | - | Alias of `tooltipPlacement` |
| `overlayColor` | `string` | No | `rgba(0, 43, 69, 0.22)` | Backdrop and outside mask color |
| `highlightColor` | `string` | No | `rgb(255, 199, 0)` | Highlight stroke color |
| `highlightStyle` | `line \| dash` | No | `line` | Also accepts `solid`, `dashed` aliases |
| `highlightAnimation` | `none \| color \| dash \| color-dash` | No | `none` | Also accepts aliases like `off`, `dash-move` |
| `tooltipTemplate` | `default \| glass \| minimal \| contrast \| dashboard-orange \| clean-white \| commerce-dark \| terminal-pop \| outline-light` | No | `clean-white` | Preset tooltip design template. Aliases: `tooltipVariant`, `template` |
| `tooltipWidth` | `number` | No | `360` | Tooltip max rendered width is `540` |
| `showHighlight` | `boolean` | No | `true` | Global default, step can override |
| `draggable` | `boolean` | No | `true` | Global default, step can override |
| `i18n` | `object` | No | locale defaults | Global text language/label overrides. Aliases: `texts`, `labels` |
| `theme` | `object` | No | internal CSS defaults | Global tooltip/button/font design overrides. Aliases: `style`, `design` |

## 4. Step Fields

### Required

| Field | Type |
|---|---|
| `id` | `string` |
| `target` | `string` — primary spotlight target; if omitted, first entry from `targets` is used |
| `kind` | `Filter \| Toggle \| Action \| Input \| Tab \| List \| Map Interaction` |
| `title` | `string` |
| `description` | `string` |

### Optional

| Field | Type | Default | Notes |
|---|---|---|---|
| `targets` | `string[]` | - | Extra spotlight targets — all listed elements are highlighted simultaneously. Tooltip anchors to the first resolved target. Aliases: `targetIds`, `componentIds`, `components`, `componentId`. Also accepts comma-separated string. |
| `featureId` | `string` | - | Primary feature identifier for feature-based mini guides. Alias: `feature`. |
| `featureIds` | `string[]` | - | Additional feature identifiers. Aliases: `features`, `featureKey`, `featureKeys`. Also accepts comma-separated string. |
| `tags` | `string[]` | - | Optional labels that can be used to filter feature guides. |
| `skippable` | `boolean` | `true` | Preferred skip field |
| `allowSkip` | `boolean` | - | Legacy alias of `skippable` |
| `advanceOn` | `auto \| click \| change \| input-idle \| none` | `auto` | Controls step completion mode |
| `inputIdleMs` | `number` | `1500` | Used for `input-idle` |
| `mustClickTarget` | `boolean` | mode-based | Forces target click before advancing |
| `mustEnterValue` | `boolean` | mode-based | Requires non-empty target value |
| `autoAdvanceMs` | `number` | off | Auto-attempt advancement after duration |
| `durationMs` | `number` | - | Alias of `autoAdvanceMs` |
| `timeoutMs` | `number` | - | Alias of `autoAdvanceMs` |
| `showAutoAdvanceProgress` | `boolean` | `true` | Shows timer progress bar |
| `showTimerLoading` | `boolean` | - | Alias of `showAutoAdvanceProgress` |
| `showHighlight` | `boolean` | inherit | Step-level override |
| `tooltipPlacement` | `auto \| top \| right \| bottom \| left` | inherit | Step-level tooltip side |
| `tooltipPosition` | `auto \| top \| right \| bottom \| left` | - | Alias of `tooltipPlacement` |
| `highlightColor` | `string` | inherit | Step-level color override |
| `highlightStyle` | `line \| dash` | inherit | Step-level style override |
| `highlightAnimation` | `none \| color \| dash \| color-dash` | inherit | Step-level animation override |
| `tooltipTemplate` | `default \| glass \| minimal \| contrast \| dashboard-orange \| clean-white \| commerce-dark \| terminal-pop \| outline-light` | inherit | Step-level preset template override. Aliases: `tooltipVariant`, `template` |
| `draggable` | `boolean` | inherit | Step-level dragging override |
| `i18n` | `object` | inherit | Step-level text overrides |
| `theme` | `object` | inherit | Step-level visual overrides |

## 5. Target Resolution Rules

- If `target` is a CSS selector (`#id`, `.class`, `[attr]`, etc.), it is used as-is.
- Otherwise it is resolved as shorthand to:

```txt
[data-click-guide="<target>"]
```

- `targets` / `componentIds` items use the same resolution logic.

Examples:
- `target: customer-name` -> `[data-click-guide="customer-name"]`
- `target: "#save-booking-btn"` -> `#save-booking-btn`

### Multi-Target Spotlighting

Use `targets` when one step should highlight more than one element:

```yaml
target: placement-btn-top
targets:
  - placement-btn-right
  - placement-btn-left
  - placement-btn-bottom
```

- All resolved elements are highlighted in the same step.
- Tooltip placement is calculated from the first resolved target.
- `targets` also accepts aliases: `targetIds`, `componentIds`, `components`, `componentId`.
- Array and comma-separated string forms are both accepted.
- Duplicate, missing, or invisible targets are skipped automatically.

### Alias and Normalization Rules

- `feature`, `featureId`, `featureKey`, `features`, `featureIds`, and `featureKeys` are normalized to step feature identifiers.
- `tag` and `tags` are normalized to step tags.
- `tooltipPosition` is normalized to `tooltipPlacement`.
- `tooltipVariant` and `template` are normalized to `tooltipTemplate`.
- `durationMs` and `timeoutMs` are normalized to `autoAdvanceMs`.
- `showTimerLoading` is normalized to `showAutoAdvanceProgress`.
- `texts` and `labels` are normalized to `i18n`.
- `style` and `design` are normalized to `theme`.
- `locale`, `lang`, and `language` are all accepted.
- placement synonyms: `up` / `above`, `down` / `below`, `start`, `end`.
- template synonyms: `standard`, `dark`, `dashboard`, `clean`, `ecommerce`, `terminal`, `outlined` and related variants.

## 6. Step Advancement Logic

### `advanceOn: auto`

`auto` resolves by `kind`:
- `Input` -> `input-idle`
- `Filter` -> `change`
- all others -> `click`

### Explicit modes

- `click`: waits for click inside target.
- `change`: listens to change events in target.
- `input-idle`: waits for typing/select input, then advances after idle duration.
- `none`: disables event-driven advancing and shows `Next` button.

### Requirement flags

- `mustClickTarget: true` blocks advancement until a target click is detected.
- `mustEnterValue: true` blocks advancement until target has a non-empty value.
  - Supports `input`, `textarea`, `select`, and nested controls inside target container.

## 7. Overlay and Tooltip Behavior

- Auto-scrolls current target into view.
- Auto-focuses target input/select controls for `change` and `input-idle` modes.
- Shows warning hint when target is missing from DOM.
- `Esc` key closes the guide.
- Only one tooltip can stay open at a time globally; opening a new guide closes any currently open guide.
- Tooltip supports:
  - `Back` button (except first step)
  - `Close` button
  - `Skip` button only when step is skippable
  - `Next` button only when mode is `none`
- Timer behavior:
  - `autoAdvanceMs > 0` enables auto-advance attempts
  - progress bar visibility is controlled by `showAutoAdvanceProgress`
- Dragging:
  - enabled by default (`draggable: true`)
  - tooltip can be dragged when enabled
- Placement fallback order:
  - `step.tooltipPlacement` -> `meta.tooltipPlacement` -> `auto`

## 8. Highlight System

- Highlight is rendered slightly outside the target for visual separation.
- Fallback order for style values:
  - `step.*` -> `frontmatter.*` -> internal defaults
- Supported style values:
  - `highlightStyle`: `line`, `dash`
  - `highlightAnimation`: `none`, `color`, `dash`, `color-dash`
- Accepted aliases are normalized by parser (for example `solid` -> `line`, `dashed` -> `dash`).

### i18n and theme customization

- `i18n.locale` supports built-in defaults: `en`, `tr`, and `da`.
- Built-in tooltip templates:
  `default`, `glass`, `minimal`, `contrast`,
  `dashboard-orange`, `clean-white`, `commerce-dark`, `terminal-pop`, `outline-light`.
- `i18n` text fields support placeholders:
  - `{current}`, `{total}` in `stepProgressLabel`
  - `{seconds}` in `autoAdvanceMessage`
  - `{target}` in `targetMissingMessage`
  - `{title}` in `completedTitleTemplate`
- `theme` can override tooltip frame/background/border, text colors, button colors, timer colors, and `fontFamily`.
- For the full key list, see [GUIDE_MD_STANDARD.md](./GUIDE_MD_STANDARD.md).

## 9. Validation and Error Handling

### Parser APIs

- `parseGuideContentSafe(content, { format })` returns:

```ts
{
  guide: GuideDefinition | null;
  issues: GuideIssue[];
}
```

- `parseGuideContent(content, { format })` returns parsed guide or throws `GuideParseError`.
- `format` supports: `auto`, `markdown`, `json`, `yaml`.
- `parseGuideMarkdownSafe/parseGuideMarkdown` remain as backward-compatible aliases (auto format).

### Other Public Exports

- `SpotlightGuideOverlay`
- `MarkdownGuideTrigger`
- `GuideParseError`
- `formatGuideIssues()`
- `guideTarget()`
- constants: `GUIDE_KINDS`, `GUIDE_ADVANCE_MODES`, `GUIDE_SOURCE_FORMATS`, `GUIDE_HIGHLIGHT_STYLES`, `GUIDE_HIGHLIGHT_ANIMATIONS`, `GUIDE_TOOLTIP_PLACEMENTS`, `GUIDE_TOOLTIP_TEMPLATES`
- types: `GuideDefinition`, `GuideMeta`, `GuideStep`, `GuideIssue`, `GuideI18n`, `GuideTheme`, `GuideKind`, `GuideAdvanceMode`, `GuideSourceFormat`, `GuideHighlightStyle`, `GuideHighlightAnimation`, `GuideTooltipPlacement`, `GuideTooltipTemplate`

### `MarkdownGuideButton` behavior

- Invalid guide content opens built-in error modal with formatted issue list.
- `onParseError` receives all issues programmatically.

### Common issue codes

- `MD_EMPTY`
- `MD_FRONTMATTER_INVALID`
- `MD_STEP_BLOCK_MISSING`
- `MD_STEP_BLOCK_INVALID`
- `MD_STEP_JSON_INVALID`
- `GUIDE_META_MISSING_TITLE`
- `GUIDE_SOURCE_INVALID`
- `GUIDE_META_INVALID_FIELD`
- `GUIDE_STEP_EMPTY`
- `GUIDE_STEP_MISSING_FIELD`
- `GUIDE_STEP_INVALID_KIND`
- `GUIDE_STEP_INVALID_ADVANCE`
- `GUIDE_STEP_INVALID_FIELD`
- `GUIDE_STEP_DUPLICATE_ID`

## 10. `MarkdownGuideButton` Props

```ts
interface MarkdownGuideButtonProps {
  content?: string;
  markdown?: string; // backward-compatible alias
  format?: "auto" | "markdown" | "json" | "yaml";
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  overlayZIndex?: number;
  renderButton?: (params: {
    onClick: () => void;
    label: string;
    disabled: boolean;
  }) => React.ReactNode;
  onGuideStart?: (guide: GuideDefinition) => void;
  onGuideClose?: () => void;
  onParseError?: (issues: GuideIssue[]) => void;
}
```

## 11. `MarkdownGuideTrigger` Props

```ts
type GuideTriggerEvent = "click" | "hover" | "focus";

interface MarkdownGuideTriggerProps {
  content?: string;
  markdown?: string; // backward-compatible alias
  format?: "auto" | "markdown" | "json" | "yaml";
  triggerOn?: GuideTriggerEvent | GuideTriggerEvent[]; // default: "click"
  as?: keyof JSX.IntrinsicElements; // default: "span"
  className?: string; // wrapper mode
  style?: React.CSSProperties; // wrapper mode
  disabled?: boolean;
  overlayZIndex?: number;
  children:
    | React.ReactNode
    | ((params: {
        startGuide: () => void;
        label: string;
        disabled: boolean;
        triggerProps: {
          onClick?: () => void;
          onMouseEnter?: () => void;
          onFocus?: () => void;
        };
      }) => React.ReactNode);
  onGuideStart?: (guide: GuideDefinition) => void;
  onGuideClose?: () => void;
  onParseError?: (issues: GuideIssue[]) => void;
}
```

## 12. Full Feature Example Markdown

````md
---
id: all-features-demo
title: All Features Demo
buttonLabel: Start Full Feature Guide
tooltipTitle: All features completed
overlayColor: "rgba(0, 43, 69, 0.22)"
highlightColor: "rgb(255, 199, 0)"
highlightStyle: line
highlightAnimation: none
tooltipWidth: 420
showHighlight: true
draggable: true
---

## Step: Manual Next
```yaml
id: intro
target: guide-start-panel
kind: Action
title: Manual mode
description: Use Next to continue.
advanceOn: none
skippable: false
```

## Step: Required Click
```yaml
id: open-create
target: open-create
kind: Action
title: Click required
description: Click the target.
mustClickTarget: true
skippable: false
```

## Step: Input Idle
```yaml
id: customer-name
target: customer-name
kind: Input
title: Enter name
description: Type and pause.
advanceOn: input-idle
inputIdleMs: 900
mustEnterValue: true
```

## Step: Auto Advance with Progress
```yaml
id: auto-step
target: auto-step
kind: Action
title: Timed step
description: Auto advances after timer.
advanceOn: none
autoAdvanceMs: 3000
showAutoAdvanceProgress: true
```

## Step: Styled Highlight
```yaml
id: save-booking
target: "#save-booking-btn"
kind: Action
title: Styled highlight
description: Uses selector target and style overrides.
highlightColor: "#f7c600"
highlightStyle: dash
highlightAnimation: color-dash
mustClickTarget: true
skippable: false
```
````
