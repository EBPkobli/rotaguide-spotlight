# GUIDE_MD_STANDARD

This package accepts guide content in `markdown`, `json`, or `yaml`.

## 0. Source Formats

- `markdown`: frontmatter + `## Step:` sections (documented below)
- `json`: guide object with `meta` and `steps`
- `yaml`: guide object with `meta` and `steps`

JSON example:

```json
{
  "meta": {
    "id": "create-booking-guide",
    "title": "Create Booking Walkthrough",
    "buttonLabel": "Start Guide"
  },
  "steps": [
    {
      "id": "open-create",
      "target": "open-create",
      "kind": "Action",
      "title": "Open booking drawer",
      "description": "Click New Booking to open the drawer."
    }
  ]
}
```

YAML example:

```yaml
meta:
  id: create-booking-guide
  title: Create Booking Walkthrough
  buttonLabel: Start Guide
steps:
  - id: open-create
    target: open-create
    kind: Action
    title: Open booking drawer
    description: Click New Booking to open the drawer.
```

## 1. Frontmatter (optional but recommended)

```md
---
id: create-booking-guide
title: Create Booking Walkthrough
buttonLabel: Start Create Guide
tooltipTitle: Create Booking completed
tooltipPlacement: auto
overlayColor: "rgba(0,43,69,0.22)"
highlightColor: "rgb(255,199,0)"
highlightStyle: line
highlightAnimation: none
tooltipTemplate: glass
tooltipWidth: 380
showHighlight: true
draggable: true
i18n:
  locale: en
  stepProgressLabel: "Step {current}/{total}"
  autoAdvanceMessage: "Auto advancing in {seconds}s"
theme:
  fontFamily: "'Segoe UI', sans-serif"
  tooltipBackgroundColor: "#ffffff"
  tooltipBorderColor: "#d9e6ef"
  primaryButtonBackgroundColor: "#1a63f5"
  primaryButtonHoverBackgroundColor: "#1554d2"
---
```

Fields:
- `id: string` optional
- `title: string` required
- `buttonLabel: string` optional
- `tooltipTitle: string` optional
- `tooltipPlacement: auto | top | right | bottom | left` optional, default `auto`
- `tooltipPosition: auto | top | right | bottom | left` optional alias of `tooltipPlacement`
  - placement synonyms are normalized: `up` / `above` -> `top`, `down` / `below` -> `bottom`, `start` -> `left`, `end` -> `right`
- `overlayColor: string` optional CSS color
- `highlightColor: string` optional CSS color
- `highlightStyle: line | dash` optional, default `line`
  - accepted aliases: `solid` -> `line`, `dashed` -> `dash`
- `highlightAnimation: none | color | dash | color-dash` optional, default `none`
  - accepted aliases include `off`, `dash-move`, `dashmove`, `dash-color`, `color-dash-move`
- `tooltipTemplate: default | glass | minimal | contrast | dashboard-orange | clean-white | commerce-dark | terminal-pop | outline-light` optional, default `clean-white`
  - aliases: `tooltipVariant`, `template`
  - accepted template synonyms: `classic`, `base`, `standard`, `dark`, `dashboard`, `dark-dashboard`, `clean`, `light`, `ecommerce`, `promo-dark`, `terminal`, `code-tour`, `outlined`, `outline`
- `tooltipWidth: number` optional px
- `showHighlight: boolean` optional, default `true`
- `draggable: boolean` optional, default `true`
- `i18n: object` optional, language + UI text overrides
  - aliases: `texts`, `labels`
  - locale aliases inside the object or root level: `locale`, `lang`, `language`
- `theme: object` optional, tooltip frame/button/font/timer design overrides
  - aliases: `style`, `design`

## 2. Steps

Each step must use:

1. heading: `## Step: <label>`
2. a fenced `yaml/yml/json` object block immediately under the heading

Example:

````md
## Step: Open Drawer
```yaml
id: open-create
target: open-create
kind: Action
title: Open New Booking Drawer
description: Click New Booking to open the drawer.
allowSkip: false
```
````

## 3. Step Fields

Required:
- `id: string`
- `target: string` primary spotlight target (CSS selector or `data-click-guide` shorthand); if omitted, first entry from `targets` is used
- `kind: Filter | Toggle | Action | Input | Tab | List | Map Interaction`
- `title: string`
- `description: string`

Optional:
- `targets: string[]` additional spotlight targets — all are highlighted simultaneously; tooltip anchors to first resolved target
  - Aliases accepted and merged: `targetIds`, `componentIds`, `components`, `componentId`
  - Comma-separated string also accepted: `targets: "btn-a, btn-b, btn-c"`
  - All entries are de-duplicated; invisible or missing targets are silently skipped
- `skippable: boolean` (default true)
- `allowSkip: boolean` legacy alias of `skippable`
- `advanceOn: auto | click | change | input-idle | none` (default auto)
- `inputIdleMs: number` (used by `input-idle`, default 1500)
- `highlightColor: string` step-level highlight border color
- `tooltipPlacement: auto | top | right | bottom | left` step-level tooltip position
- `tooltipPosition: auto | top | right | bottom | left` alias of `tooltipPlacement`
- `highlightStyle: line | dash` step-level border style override
- `highlightAnimation: none | color | dash | color-dash` step-level animation override
- `tooltipTemplate: default | glass | minimal | contrast | dashboard-orange | clean-white | commerce-dark | terminal-pop | outline-light` step-level preset override
- `tooltipVariant: ...` alias of `tooltipTemplate`
- `template: ...` alias of `tooltipTemplate`
- `mustClickTarget: boolean` force step completion only after target click
- `mustEnterValue: boolean` force non-empty value in target input/select
- `autoAdvanceMs: number` auto-complete step after this duration
- `durationMs: number` alias of `autoAdvanceMs`
- `timeoutMs: number` alias of `autoAdvanceMs`
- `showAutoAdvanceProgress: boolean` show/hide timer loading bar
- `showTimerLoading: boolean` alias of `showAutoAdvanceProgress`
- `showHighlight: boolean` step-level override for yellow highlight border
- `draggable: boolean` step-level override for tooltip dragging
- `i18n: object` step-level text overrides
- `theme: object` step-level visual overrides

### i18n keys

Built-in locale defaults:
- `locale: en` (default)
- `locale: tr` (Turkish built-in labels/messages)
- `locale: da` (Danish built-in labels/messages)

Accepted object aliases:
- `i18n`
- `texts`
- `labels`

Accepted locale field aliases:
- `locale`
- `lang`
- `language`

All text fields can also be set directly (global or step-level):
- `stepProgressLabel` (supports `{current}`, `{total}`)
- `backButtonLabel`
- `nextButtonLabel`
- `closeButtonLabel`
- `skipButtonLabel`
- `finishButtonLabel`
- `targetMissingMessage` (supports `{target}`)
- `followHighlightMessage`
- `followTargetMessage`
- `requireClickMessage`
- `requireInputMessage`
- `clickHighlightedMessage`
- `autoAdvanceMessage` (supports `{seconds}`)
- `completedTitleTemplate` (supports `{title}`)
- `completedDescription`

### theme keys

All theme fields are optional and can be set in `meta.theme` or `step.theme`.
Accepted object aliases: `theme`, `style`, `design`.

Fields:
- `tooltipTemplate` (`default` | `glass` | `minimal` | `contrast` | `dashboard-orange` | `clean-white` | `commerce-dark` | `terminal-pop` | `outline-light`)
  - aliases: `tooltipVariant`, `template`
- `fontFamily`
- `tooltipBackgroundColor`
- `tooltipTextColor`
- `tooltipBorderColor`
- `tooltipBorderRadius` (number, px)
- `tooltipShadow`
- `titleColor`
- `descriptionColor`
- `hintColor`
- `warningColor`
- `stepPillBackgroundColor`
- `stepPillTextColor`
- `kindPillBackgroundColor`
- `kindPillTextColor`
- `primaryButtonBackgroundColor`
- `primaryButtonTextColor`
- `primaryButtonBorderColor`
- `primaryButtonHoverBackgroundColor`
- `primaryButtonHoverBorderColor`
- `ghostButtonBackgroundColor`
- `ghostButtonTextColor`
- `ghostButtonBorderColor`
- `timerTrackColor`
- `timerFillColor`

### tooltipTemplate presets

- `default`: balanced default card
- `glass`: frosted/blurred card look
- `minimal`: flat, low-shadow, compact look
- `contrast`: dark high-contrast look
- `dashboard-orange`: dark dashboard look with orange accents
- `clean-white`: large-radius white card with orange CTA emphasis
- `commerce-dark`: dark commerce look with orange border and CTA
- `terminal-pop`: bold orange presentation card
- `outline-light`: light outlined card with accent frame

You can set `tooltipTemplate` at:
- root/frontmatter level (`meta`)
- per-step level (`step`)
- `theme.tooltipTemplate` (alias path)

## 4. Target Resolution

- If `target` looks like CSS selector (`#x`, `.x`, `[x]`, etc), it is used directly.
- Otherwise it is treated as shorthand and resolved to:
  - `[data-click-guide="<target>"]`
- Multi target fields (`targets`, `componentIds`, etc.) follow the same selector rules.

Example:
- `target: customer-name` => `[data-click-guide="customer-name"]`
- `target: "#customer-name-input"` => `#customer-name-input`

## 4.1 Normalization Aliases

Parser normalization supported by guide content:

- `tooltipPosition` -> `tooltipPlacement`
- `tooltipVariant` / `template` -> `tooltipTemplate`
- `durationMs` / `timeoutMs` -> `autoAdvanceMs`
- `showTimerLoading` -> `showAutoAdvanceProgress`
- `targetIds` / `componentIds` / `components` / `componentId` -> merged into `targets`
- `texts` / `labels` -> `i18n`
- `style` / `design` -> `theme`
- `lang` / `language` -> locale selection

## 5. Full Example

````md
---
id: create-booking-guide
title: Create Booking Walkthrough
buttonLabel: Start Create Guide
i18n:
  locale: en
  stepProgressLabel: "Step {current}/{total}"
  autoAdvanceMessage: "Auto advancing in {seconds}s"
theme:
  fontFamily: "'Segoe UI', 'Inter', sans-serif"
  tooltipBorderColor: "#d9e6ef"
  primaryButtonBackgroundColor: "#1a63f5"
  primaryButtonHoverBackgroundColor: "#1554d2"
---

## Step: Open Drawer
```yaml
id: open-create
target: open-create
kind: Action
title: Open Booking Drawer
description: Click New Booking to open the create drawer.
highlightColor: "#f7c600"
skippable: false
mustClickTarget: true
```

## Step: Fill Customer Name
```yaml
id: customer-name
target: customer-name
kind: Input
title: Enter customer name
description: Type a customer name.
mustEnterValue: true
inputIdleMs: 1500
i18n:
  requireInputMessage: "Enter a customer name in this field."
```

## Step: Save
```yaml
id: save-booking
target: save-booking
kind: Action
title: Save booking
description: Click Save Booking to finish this flow.
highlightStyle: dash
highlightAnimation: color-dash
mustClickTarget: true
skippable: false
autoAdvanceMs: 6000
showAutoAdvanceProgress: true
theme:
  timerFillColor: "#0ea5e9"
```
````

## 6. Advanced Behavior Notes

- `mustClickTarget: true` + `advanceOn: none`: user can still click `Next`, but step only advances after target click requirement is met.
- `mustEnterValue: true` works for `input`, `textarea`, `select` and input groups inside target container.
- `autoAdvanceMs` is optional. If defined, step attempts auto-complete when timer ends.
- Timer loading UI is controlled by `showAutoAdvanceProgress` (or `showTimerLoading` alias).
- Highlight can be disabled globally with frontmatter `showHighlight: false`, then re-enabled for selected steps via `showHighlight: true`.
- Highlight border is rendered 1px outside the target box for cleaner focus separation.
- Tooltip dragging is enabled by default and can be turned off globally or per step with `draggable: false`.
- Color fallback order: `step.highlightColor` -> `frontmatter.highlightColor` -> default `rgb(255, 199, 0)`.
- Style fallback order: `step.highlightStyle` -> `frontmatter.highlightStyle` -> `line`.
- Animation fallback order: `step.highlightAnimation` -> `frontmatter.highlightAnimation` -> `none`.
- Template fallback order: `step.tooltipTemplate` -> `step.theme.tooltipTemplate` -> `meta.tooltipTemplate` -> `meta.theme.tooltipTemplate` -> `clean-white`.
- Placement fallback order: `step.tooltipPlacement` -> `meta.tooltipPlacement` -> `auto`.
- Text fallback order: `step.i18n.*` -> `meta.i18n.*` -> built-in locale defaults (`en`/`tr`/`da`).
- Theme fallback order: `step.theme.*` -> `meta.theme.*` -> internal CSS defaults.
- If color fields are empty strings, they are treated as undefined and default behavior applies.

## 7. Validation Errors

The parser reports clear errors with line numbers, for example:
- missing title in frontmatter
- missing or invalid step block
- duplicate step id
- invalid kind
- invalid `advanceOn`
- invalid `autoAdvanceMs`

Use:
- `parseGuideContentSafe(content, { format: "auto" | "markdown" | "json" | "yaml" })` for non-throwing results
- `parseGuideContent(content, { format })` to throw `GuideParseError`
- `parseGuideMarkdownSafe/parseGuideMarkdown` are backward-compatible aliases (now auto format)

## 8. Guide Triggering (React)

Guide content format is independent from how you trigger the UI.

### 8.1 `MarkdownGuideButton` (default)

```tsx
import { MarkdownGuideButton } from "rotaguide-spotlight";

<MarkdownGuideButton content={guideContent} label="Start Guide" />
```

### 8.2 `MarkdownGuideTrigger` (any wrapper element + events)

`MarkdownGuideTrigger` lets you wrap any element and start the guide via `click`, `hover`, `focus` (single or multiple).

```tsx
import { MarkdownGuideTrigger } from "rotaguide-spotlight";

<MarkdownGuideTrigger content={guideContent} triggerOn={["hover", "focus"]} as="div">
  <section className="tour-card">Hover or focus this card to start</section>
</MarkdownGuideTrigger>
```

Main props:
- `triggerOn?: "click" | "hover" | "focus" | Array<...>` (default: `"click"`)
- `as?: keyof JSX.IntrinsicElements` wrapper tag (default: `"span"`)
- `children: ReactNode | ((params) => ReactNode)`

### 8.3 Manual trigger inside custom handlers (`onClick`, etc.)

Use render-function children to get `startGuide()` and call it inside your own event flow:

```tsx
<MarkdownGuideTrigger content={guideContent}>
  {({ startGuide, triggerProps }) => (
    <button
      type="button"
      {...triggerProps}
      onClick={() => {
        // your custom logic
        startGuide();
      }}
    >
      Start with custom onClick
    </button>
  )}
</MarkdownGuideTrigger>
```

## 9. Agent-Friendly Integration Guide

This section is optimized for coding agents that need deterministic integration steps.

### 9.1 Agent Objective

Given this library and a target React app, the agent should:
- map UI targets with `data-click-guide` (or CSS selectors),
- load guide content (`markdown` / `json` / `yaml`),
- choose a trigger strategy (`MarkdownGuideButton` or `MarkdownGuideTrigger`),
- verify parse and runtime target resolution.

### 9.2 Deterministic Integration Checklist

1. Import styles exactly once:
   - `import "rotaguide-spotlight/style.css";`
2. Add guide targets in UI:
   - preferred: `...guideTarget("some-id")`
   - equivalent: `data-click-guide="some-id"`
3. Ensure each step `target`/`targets` exists in rendered DOM.
4. Provide guide content string and correct `format` (`auto` unless strict format needed).
5. Choose trigger mode:
   - simple CTA: `MarkdownGuideButton`
   - wrapper/event/manual control: `MarkdownGuideTrigger`
6. Validate content before shipping:
   - `parseGuideContentSafe(content, { format })`
   - block release if `issues.length > 0`
7. Runtime smoke test:
   - start guide
   - confirm first step highlight appears
   - confirm navigation/close works

### 9.3 Machine-Readable Integration Contract

Agents can return integration result using this JSON shape:

```json
{
  "integrationStatus": "ready",
  "guideFormat": "markdown",
  "triggerStrategy": "MarkdownGuideTrigger",
  "targetMapping": {
    "mapped": ["open-create", "customer-name", "save-booking"],
    "missing": []
  },
  "parse": {
    "ok": true,
    "issueCount": 0
  },
  "runtimeSmokeTest": {
    "guideOpened": true,
    "firstStepVisible": true,
    "closeWorks": true
  }
}
```

Allowed values:
- `integrationStatus`: `ready | blocked | partial`
- `guideFormat`: `auto | markdown | json | yaml`
- `triggerStrategy`: `MarkdownGuideButton | MarkdownGuideTrigger`

### 9.4 Recommended Agent Decision Rules

- If the app already has a start button: use `MarkdownGuideButton`.
- If guide start must be tied to existing app events (`onClick`, `onHover`, `onFocus`): use `MarkdownGuideTrigger`.
- If existing business logic must run before opening guide: use render-function children and call `startGuide()` manually.
- If parser returns issues: do not mount trigger as production-ready; surface `formatGuideIssues(issues)`.

### 9.5 Minimal Agent Prompt Template

Use this prompt for another coding agent:

```txt
Integrate rotaguide-spotlight into this React app.
Constraints:
1) Keep existing UI behavior unchanged.
2) Add data-click-guide mappings for all guide step targets.
3) Use MarkdownGuideTrigger with manual startGuide() inside existing onClick handlers when custom logic exists.
4) Validate with parseGuideContentSafe(format:auto) and report issues.
5) Return result in the integration contract JSON from GUIDE_MD_STANDARD.md section 9.3.
```
