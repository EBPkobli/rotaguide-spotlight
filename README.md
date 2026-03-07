# md-spotlight-guide-tool

Markdown / JSON / YAML-driven, click-through spotlight walkthrough for React applications.

- Single button to start guide
- Black transparent backdrop + yellow focus mask
- Step-by-step progression from markdown, JSON, or YAML content
- Runtime validation and clear parse error dialog

## Installation

```bash
npm install md-spotlight-guide-tool
```

Also import styles once in your app:

```ts
import "md-spotlight-guide-tool/style.css";
```

## Quick Usage

```tsx
import { MarkdownGuideButton, guideTarget } from "md-spotlight-guide-tool";
import "md-spotlight-guide-tool/style.css";
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

`guideTarget("x")` is a helper for adding `data-click-guide="x"`.

In guide content, `target` can be:
- A shorthand target id like `customer-name` (resolved to `[data-click-guide="customer-name"]`)
- A full CSS selector like `#save-btn` or `[data-test="save"]`

## Guide Format

See [GUIDE_MD_STANDARD.md](./GUIDE_MD_STANDARD.md) for full markdown format and JSON/YAML alternatives.
For a practical feature-by-feature reference, see [TOOL_FEATURES_GUIDE.md](./TOOL_FEATURES_GUIDE.md).

### Advanced Step Options

You can control behavior per step in markdown/json/yaml:

- `skippable: boolean`
- `mustClickTarget: boolean`
- `mustEnterValue: boolean`
- `autoAdvanceMs: number` (`durationMs` / `timeoutMs` aliases)
- `showAutoAdvanceProgress: boolean` (`showTimerLoading` alias)
- `showHighlight: boolean` (also available globally in frontmatter)
- `highlightColor: string` (step-level, fallback to frontmatter/default)
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
  locale: tr
  stepProgressLabel: "Adım {current}/{total}"
  backButtonLabel: "Geri"
  nextButtonLabel: "İleri"
  autoAdvanceMessage: "{seconds}s içinde otomatik ilerleniyor"
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
- `className?: string`
- `style?: React.CSSProperties`
- `renderButton?: ({ onClick, label, disabled }) => ReactNode`
- `onGuideStart?: (guide) => void`
- `onGuideClose?: () => void`
- `onParseError?: (issues) => void`

If both `content` and `markdown` are set, `content` is used.
`GuideI18n` and `GuideTheme` types are exported for TypeScript usage.

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
