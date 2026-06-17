# RotaGuide Spotlight

Markdown / JSON / YAML-driven, click-through spotlight walkthrough for React applications.

Latest release notes: see [CHANGELOG.md](./CHANGELOG.md).

| | Link |
|---|---|
| **Landing Page** | [rotaguide-commercial.vercel.app](https://rotaguide-commercial.vercel.app) |
| **Guide Editor** | [rotaguide-spotlight-editor.vercel.app](https://rotaguide-spotlight-editor.vercel.app) |
| **Editor GitHub** | [github.com/EBPkobli/rotaguide-spotlight-editor](https://github.com/EBPkobli/rotaguide-spotlight-editor) |
| **Medium Article** | [Building RotaGuide Spotlight](https://medium.com/@furkansteam81/building-rotaguide-spotlight-a-lightweight-guide-system-for-complex-web-apps-23e2e49ed09d) |

- Start guide from a button or custom trigger events
- Black transparent backdrop + yellow focus mask
- Step-by-step progression from markdown, JSON, or YAML content
- Feature-based mini guides from the same full guide content
- One-time release notes / change log popup with optional required updates
- Multi-target spotlighting in a single step
- Placement presets, template presets, i18n, and theme overrides
- Runtime validation and clear parse error dialog

## Installation

```bash
npm install rotaguide-spotlight
```

Also import styles once in your app:

```ts
import "rotaguide-spotlight/style.css";
```

## Quick Usage

```tsx
import { MarkdownGuideButton, guideTarget } from "rotaguide-spotlight";
import "rotaguide-spotlight/style.css";
import guideMarkdown from "./create-booking.guide.md?raw";

export function CreatePage() {
  return (
    <div>
      <div>
        <button {...guideTarget("open-create")}>New Booking</button>
        <input {...guideTarget("customer-name")} placeholder="Customer name" />
        <button {...guideTarget("save-booking")}>Save Booking</button>
      </div>

      <MarkdownGuideButton content={guideMarkdown} label="Start Create Guide" />
    </div>
  );
}
```

## Custom Triggers (Click / Hover / Focus / Manual)

You can start the same guide without `MarkdownGuideButton` by using `MarkdownGuideTrigger`.

```tsx
import { MarkdownGuideTrigger } from "rotaguide-spotlight";

<MarkdownGuideTrigger content={guideMarkdown} triggerOn={["hover", "focus"]} as="div">
  <section className="tour-card">Hover or focus this card to start</section>
</MarkdownGuideTrigger>

<MarkdownGuideTrigger content={guideMarkdown}>
  {({ startGuide, triggerProps }) => (
    <button
      type="button"
      {...triggerProps}
      onClick={() => {
        console.log("your custom click logic");
        startGuide();
      }}
    >
      Start from custom onClick
    </button>
  )}
</MarkdownGuideTrigger>
```

## Feature Release Notes

Use `FeatureReleaseNotes` when a release should be announced once, and selected entries should launch only the relevant guide steps.

```tsx
import { FeatureReleaseNotes } from "rotaguide-spotlight";
import { Activity, Sparkles } from "lucide-react";

<FeatureReleaseNotes
  id="vessel-tile-signals-2026-06"
  title="What's new"
  eyebrow="Pulse update"
  subtitle="Vessel tiles now show progress and operational exceptions."
  headerIcon={<Sparkles aria-hidden="true" />}
  theme={{
    headerAccentColor: "#EC5B13",
    actionBackgroundColor: "#002B45",
    dismissBackgroundColor: "#EC5B13",
  }}
  showGuideAll
  guideAllLabel="Guide all features"
  content={terminalGuideMarkdown}
  items={[
    {
      id: "vessel-progress",
      title: "Overall Milestone Progress",
      description: "See completed milestones directly on each vessel tile.",
      icon: <Activity aria-hidden="true" />,
      accentColor: "#1A63F5",
      accentBackgroundColor: "#D1EBFF",
      featureIds: "vessel-tile-progress",
      required: true,
      ctaLabel: "Show",
      repeatCtaLabel: "Show again",
    },
    {
      id: "vessel-operational-exceptions",
      title: "Operational Exception Indicator",
      description: "Spot in-progress or incomplete operational exceptions faster.",
      featureIds: "vessel-operational-exceptions",
    },
  ]}
/>
```

The component stores dismissed state in `localStorage` using the release `id`.
Pass a new `id` for a new release, or pass `storageKey` if your app needs a user-specific key.

`guideTarget("x")` is a helper for adding `data-click-guide="x"`.

In guide content, `target` can be:
- A shorthand target id like `customer-name` (resolved to `[data-click-guide="customer-name"]`)
- A full CSS selector like `#save-btn` or `[data-test="save"]`

For multi-spotlight in a single step, you can also set `targets` / `componentIds` as an array.

Parser aliases are also supported for authoring convenience:
- `targetIds`, `componentIds`, `components`, `componentId` -> `targets`
- `tooltipPosition` -> `tooltipPlacement`
- `tooltipVariant` / `template` -> `tooltipTemplate`
- `durationMs` / `timeoutMs` -> `autoAdvanceMs`
- `showTimerLoading` -> `showAutoAdvanceProgress`

## Guide Format

See [GUIDE_MD_STANDARD.md](./GUIDE_MD_STANDARD.md) for full markdown format and JSON/YAML alternatives.
For a practical feature-by-feature reference, see [TOOL_FEATURES_GUIDE.md](./TOOL_FEATURES_GUIDE.md).

### Advanced Step Options

You can control behavior per step in markdown/json/yaml:

- `targets: string[]` (highlight multiple elements at once; tooltip anchors to first; aliases: `targetIds`, `componentIds`, `components`, `componentId`)
- `featureId: string` / `featureIds: string[]` (group steps for feature-based mini guides)
- `tags: string[]` (additional filter labels for feature guide selection)
- `skippable: boolean`
- `mustClickTarget: boolean`
- `mustEnterValue: boolean`
- `autoAdvanceMs: number` (`durationMs` / `timeoutMs` aliases)
- `showAutoAdvanceProgress: boolean` (`showTimerLoading` alias)
- `showHighlight: boolean` (also available globally in frontmatter)
- `highlightColor: string` (step-level, fallback to frontmatter/default)
- `tooltipPlacement: auto | top | right | bottom | left` (global or per-step)
- `highlightStyle: line | dash`
- `highlightAnimation: none | color | dash | color-dash`
- `tooltipTemplate: default | glass | minimal | contrast | dashboard-orange | clean-white | commerce-dark | terminal-pop | outline-light` (global or per-step preset)
- `draggable: boolean` (also available globally in frontmatter, default `true`)
- `i18n: object` (locale + all UI text labels/messages, global or per-step)
- `theme: object` (tooltip frame colors, button colors, timer colors, font family; global or per-step)

### Localization & Theme

You can fully customize built-in text and tooltip styling from guide data.
Built-in locale defaults: `en`, `tr`, `da`.
Built-in tooltip templates:
`default`, `glass`, `minimal`, `contrast`,
`dashboard-orange`, `clean-white`, `commerce-dark`, `terminal-pop`, `outline-light`.

```yaml
tooltipTemplate: glass
i18n:
  locale: en
  stepProgressLabel: "Step {current}/{total}"
  backButtonLabel: "Back"
  nextButtonLabel: "Next"
  autoAdvanceMessage: "Auto advancing in {seconds}s"
theme:
  fontFamily: "'Poppins', 'Segoe UI', sans-serif"
  tooltipBackgroundColor: "#ffffff"
  tooltipBorderColor: "#dbe7ee"
  titleColor: "#0b2540"
  primaryButtonBackgroundColor: "#1a63f5"
  primaryButtonHoverBackgroundColor: "#1554d2"
```

`i18n` placeholders:
- `{current}` / `{total}` for `stepProgressLabel`
- `{seconds}` for `autoAdvanceMessage`
- `{target}` for `targetMissingMessage`
- `{title}` for `completedTitleTemplate`

Additional normalization supported by the parser:
- `locale`, `lang`, and `language` all map to locale selection
- `i18n`, `texts`, and `labels` are accepted for text override objects
- `theme`, `style`, and `design` are accepted for theme override objects
- placement synonyms: `up` / `above`, `down` / `below`, `start`, `end`
- template synonyms: `standard`, `dark`, `dashboard`, `clean`, `ecommerce`, `terminal`, `outlined`

## Error Handling

Invalid guide content opens a detailed error modal with:
- issue code
- line number
- clear message and hint

You can also capture issues programmatically:

```tsx
<MarkdownGuideButton
  content={guideMarkdown}
  onParseError={(issues) => console.error(issues)}
/>
```

## API

### `MarkdownGuideButton`

Props:
- `content?: string` (`markdown` string content, JSON string, or YAML string)
- `markdown?: string` (legacy alias, still supported)
- `format?: "auto" | "markdown" | "json" | "yaml"` (default: `auto`)
- `label?: string`
- `disabled?: boolean`
- `overlayZIndex?: number`
- `featureIds?: string | string[]`
- `tags?: string | string[]`
- `stepIds?: string | string[]`
- `featureMode?: "any" | "all"`
- `className?: string`
- `style?: React.CSSProperties`
- `renderButton?: ({ onClick, label, disabled }) => ReactNode`
- `onGuideStart?: (guide) => void`
- `onGuideClose?: () => void`
- `onParseError?: (issues) => void`

If both `content` and `markdown` are set, `content` is used.
`GuideI18n` and `GuideTheme` types are exported for TypeScript usage.

### `MarkdownGuideTrigger`

Props:
- `content?: string` (`markdown` string content, JSON string, or YAML string)
- `markdown?: string` (legacy alias, still supported)
- `format?: "auto" | "markdown" | "json" | "yaml"` (default: `auto`)
- `triggerOn?: "click" | "hover" | "focus" | Array<...>` (default: `"click"`)
- `as?: keyof JSX.IntrinsicElements` (default: `"span"`, used for wrapper mode)
- `children: ReactNode | ((params) => ReactNode)`
- `className?: string` (wrapper mode)
- `style?: React.CSSProperties` (wrapper mode)
- `disabled?: boolean`
- `overlayZIndex?: number`
- `featureIds?: string | string[]`
- `tags?: string | string[]`
- `stepIds?: string | string[]`
- `featureMode?: "any" | "all"`
- `onGuideStart?: (guide) => void`
- `onGuideClose?: () => void`
- `onParseError?: (issues) => void`

Render function params:
- `startGuide: () => void` (manual trigger support inside your own handlers)
- `label: string` (`meta.buttonLabel` fallback)
- `disabled: boolean`
- `triggerProps: { onClick?, onMouseEnter?, onFocus? }`

### `FeatureReleaseNotes`

Props:
- `id: string` (release identifier used for one-time storage)
- `title?: string` (default: `"Change Log"`)
- `eyebrow?: string`
- `subtitle?: string`
- `headerIcon?: ReactNode`
- `items: FeatureReleaseNoteItem[]`
- `content?: string` / `markdown?: string`
- `format?: "auto" | "markdown" | "json" | "yaml"`
- `storageKey?: string`
- `forceRequired?: boolean` (default: `true`)
- `allowRepeatGuideViews?: boolean` (default: `true`)
- `showItemIcons?: boolean` (default: `true`)
- `showItemBadges?: boolean` (default: `true`)
- `showRequiredBadges?: boolean` (default: `true`)
- `showViewedBadges?: boolean` (default: `true`)
- `showGuideAll?: boolean`
- `guideAllLabel?: string`, `guideAllRepeatLabel?: string`, `guideAllTitle?: string`
- `dismissLabel?: string`
- `requiredHint?: string`
- `theme?: FeatureReleaseNotesTheme`
- `onDismiss?: ({ releaseId, acknowledgedItemIds }) => void`
- `onItemGuideRequest?: (item) => false | void` (return `false` when your app handles routing/guide start itself)
- `onGuideAllRequest?: ({ releaseId, items }) => false | void`

Item fields:
- `id`, `title`, `description?`, `badge?`
- `icon?: ReactNode`, `accentColor?`, `accentBackgroundColor?`
- `featureId?`, `featureIds?`, `tags?`, `stepIds?`
- `required?: boolean`
- `ctaLabel?`, `repeatCtaLabel?`, `acknowledgeLabel?`, `viewedLabel?`, `guideTitle?`

`theme` is a plain object of design tokens such as `headerAccentColor`, `actionBackgroundColor`, `dismissBackgroundColor`, `cardTextColor`, and border radius values. You can keep those tokens in JSON/YAML and pass the parsed object to `FeatureReleaseNotes`.
Use `showGuideAll` when the popup should offer both per-feature guide actions and a single guide-through-all-features action.
Use `showItemIcons={false}` and/or `showItemBadges={false}` for a quieter product-style changelog that still keeps feature guide actions.

### `parseGuideContentSafe(content, options?)`

Returns:

```ts
{
  guide: GuideDefinition | null;
  issues: GuideIssue[];
}
```

`options.format` supports: `auto` (default), `markdown`, `json`, `yaml`.

### `parseGuideContent(content, options?)`

Returns parsed guide or throws `GuideParseError`.

### Backward-Compatible Aliases

- `parseGuideMarkdownSafe(markdown)` (auto format support)
- `parseGuideMarkdown(markdown)` (auto format support)

### Other Exports

- `SpotlightGuideOverlay`
- `MarkdownGuideTrigger`
- `FeatureReleaseNotes`
- `GuideParseError`
- `formatGuideIssues()`
- `guideTarget()`
- `filterGuideByFeatures()`
- `createFeatureGuideExtension()`
- exported constants: `GUIDE_KINDS`, `GUIDE_ADVANCE_MODES`, `GUIDE_SOURCE_FORMATS`, `GUIDE_HIGHLIGHT_STYLES`, `GUIDE_HIGHLIGHT_ANIMATIONS`, `GUIDE_TOOLTIP_PLACEMENTS`, `GUIDE_TOOLTIP_TEMPLATES`
- exported types: `GuideDefinition`, `GuideMeta`, `GuideStep`, `GuideIssue`, `GuideI18n`, `GuideTheme`, `GuideKind`, `GuideAdvanceMode`, `GuideSourceFormat`, `GuideHighlightStyle`, `GuideHighlightAnimation`, `GuideTooltipPlacement`, `GuideTooltipTemplate`

## Notes

- This package is client-side and relies on DOM selectors.
- For SSR frameworks, render guide button/overlay only where browser DOM is available.
- Single-open rule: if a guide tooltip opens while another is open, the previous one closes automatically.

## Local Example Project

A full-feature runnable demo is available in `examples/simple-react`.

```bash
cd examples/simple-react
npm install
npm run dev
```

Then open the local Vite URL and click **Start Full Feature Guide**.
