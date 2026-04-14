# RotaGuide Spotlight — Architecture Proposal

## 1. Executive Summary

RotaGuide Spotlight should evolve from a monolithic component library into a **layered, extension-aware platform** with three clearly separated tiers:

| Layer | Responsibility | Owner |
|---|---|---|
| **Core** | Generic runtime, parser, overlay, types, default themes | Public OSS repo |
| **Extension points** | Hooks, render overrides, target resolvers, theme adapters | Defined by core, implemented by consumers |
| **Consumer layer** | Branding, analytics, access control, custom presets | Private app / package / monorepo |

**Key architectural decisions made:**

1. **`SpotlightExtension` interface** — a single, flat, fully-optional hook bag. No class hierarchies, no registration ceremony.
2. **`createSpotlight()` factory** — creates a configured instance that bundles theme defaults + extensions + presets into one object.
3. **`SpotlightProvider` context** — optional React context to inject an instance into a subtree. Components also accept `instance` and `extension` as direct props.
4. **`definePreset()` / `defineExtension()` / `defineGuide()`** — typed identity helpers for ergonomic definition outside core.
5. **`composeExtensions()`** — merges multiple extensions into one with well-defined composition rules (pipeline for transforms, first-wins for render overrides, all-called for lifecycle hooks).

All of this is **backward-compatible**. Existing usage without extensions continues to work with zero changes.

---

## 2. Recommended Architecture

### Architecture diagram

```
┌──────────────────────────────────────────────────────┐
│                    Consumer App                       │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Brand Preset │  │ Analytics Ext│  │ ACL Ext    │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘ │
│         └────────────────┼─────────────────┘        │
│                          │                           │
│              createSpotlight({ ... })                │
│                          │                           │
│              SpotlightProvider / props               │
│                          │                           │
├──────────────────────────┼───────────────────────────┤
│               RotaGuide Spotlight Core               │
│                                                      │
│  ┌────────┐ ┌──────────┐ ┌───────┐ ┌─────────────┐ │
│  │ Parser │ │ Overlay   │ │ DOM   │ │ Validator   │ │
│  │ (md/   │ │ (render + │ │ utils │ │             │ │
│  │ json/  │ │ lifecycle)│ │       │ │             │ │
│  │ yaml)  │ │           │ │       │ │             │ │
│  └────────┘ └──────────┘ └───────┘ └─────────────┘ │
│  ┌─────────────┐ ┌────────────┐ ┌────────────────┐ │
│  │ types.ts    │ │ style.css  │ │ extensions.ts  │ │
│  │ (contracts) │ │ (themes)   │ │ (hook shapes)  │ │
│  └─────────────┘ └────────────┘ └────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### What belongs where

| Responsibility | Layer | Label |
|---|---|---|
| `GuideDefinition`, `GuideStep`, `GuideTheme` types | **Core** | Core |
| Markdown / JSON / YAML parser | **Core** | Core |
| `SpotlightGuideOverlay` component | **Core** | Core |
| Default tooltip templates (clean-white, glass, etc.) | **Core** | Core |
| `SpotlightExtension` interface + `composeExtensions` | **Core** | Extension point |
| `createSpotlight`, `definePreset`, `defineGuide` | **Core** | Extension point |
| `SpotlightProvider` context | **Core** | Extension point |
| `guideTarget()` data-attribute helper | **Core** | Core |
| `resolveTargetSelector` (default `[data-click-guide]`) | **Core** | Core |
| Validation (`validateGuideDefinition`) | **Core** | Core |
| Built-in i18n (en, tr, da) | **Core** | Core |
| Custom selector resolution logic | **Extension point** | Consumer-owned |
| Analytics event tracking | **Extension point** | Consumer-owned |
| Access control / `canStartGuide` | **Extension point** | Consumer-owned |
| Custom tooltip body rendering | **Extension point** | Consumer-owned |
| Custom completed screen rendering | **Extension point** | Consumer-owned |
| Overlay wrapping (providers, error boundaries) | **Extension point** | Consumer-owned |
| Guide transform (inject metadata, feature flags) | **Extension point** | Consumer-owned |
| Step transform (inject descriptions, rewrite targets) | **Extension point** | Consumer-owned |
| Theme resolution override | **Extension point** | Consumer-owned |
| i18n resolution override | **Extension point** | Consumer-owned |
| Company brand theme preset | **Consumer** | Consumer-owned |
| Product-specific guide packs | **Consumer** | Consumer-owned |
| Wrapper components (e.g. `<AcmeGuideButton>`) | **Consumer** | Consumer-owned |
| Guide source loaders (fetch from CMS, API) | **Consumer** | Consumer-owned |
| Persistence / progress storage | **Consumer** | Consumer-owned |
| Feature flag gating | **Consumer** | Consumer-owned |

---

## 3. Public API Proposal

### 3.1 `defineExtension(ext)` — **Core: Extension point**

Typed identity function. Makes extension definitions discoverable and type-safe.

```ts
import { defineExtension } from "rotaguide-spotlight";

export const analytics = defineExtension({
  name: "analytics",
  onGuideStart({ guideId }) {
    posthog.capture("guide_started", { guideId });
  },
  onStepChange({ guideId, stepIndex, step }) {
    posthog.capture("guide_step_viewed", { guideId, stepIndex, stepId: step.id });
  },
  onGuideComplete({ guideId }) {
    posthog.capture("guide_completed", { guideId });
  },
  onGuideClose({ guideId, stepIndex, reason }) {
    posthog.capture("guide_closed", { guideId, stepIndex, reason });
  },
});
```

### 3.2 `definePreset(preset)` — **Core: Extension point**

Bundles a theme, i18n defaults, and extensions into a reusable package.

```ts
import { definePreset } from "rotaguide-spotlight";
import { analytics } from "./extensions/analytics";

export const acmePreset = definePreset({
  name: "acme-brand",
  theme: {
    primaryButtonBackgroundColor: "#e11d48",
    primaryButtonTextColor: "#ffffff",
    tooltipBorderRadius: 8,
    fontFamily: "'Inter', sans-serif",
  },
  tooltipTemplate: "clean-white",
  i18n: { locale: "en" },
  extensions: [analytics],
});
```

### 3.3 `createSpotlight(config)` — **Core: Extension point**

Creates a runtime instance that merges preset + extra extensions + overrides.

```ts
import { createSpotlight } from "rotaguide-spotlight";
import { acmePreset } from "./presets/acme";
import { accessControl } from "./extensions/access-control";

export const spotlight = createSpotlight({
  preset: acmePreset,
  extensions: [accessControl],
});
```

### 3.4 `SpotlightProvider` — **Core: Extension point**

React context provider. Optional — components also accept `instance` and `extension` as props.

```tsx
import { SpotlightProvider } from "rotaguide-spotlight";
import { spotlight } from "./spotlight";

function App() {
  return (
    <SpotlightProvider instance={spotlight}>
      <MyApp />
    </SpotlightProvider>
  );
}
```

### 3.5 `defineGuide(guide)` — **Core: Extension point**

Typed identity helper for programmatic guide definitions.

```ts
import { defineGuide } from "rotaguide-spotlight";

export const onboardingGuide = defineGuide({
  meta: { id: "onboarding", title: "Getting Started" },
  steps: [
    {
      id: "welcome",
      target: "nav-home",
      title: "Welcome",
      kind: "Action",
      description: "Click here to start.",
    },
  ],
});
```

### 3.6 `composeExtensions(...exts)` — **Core: Extension point**

Merges multiple extensions with well-defined rules:

| Hook type | Composition rule |
|---|---|
| Lifecycle (`onGuideStart`, `onStepChange`, etc.) | All called in order |
| `canStartGuide` | All called; first `false` wins |
| Transforms (`transformGuide`, `transformStep`) | Piped: output of one feeds next |
| Theme/i18n resolvers | Piped (accumulated merge) |
| `resolveTargetSelector` | First non-undefined result wins |
| Render overrides (`renderTooltipBody`, etc.) | First non-undefined result wins |
| `wrapOverlay` | All applied in order (nested wrapping) |

```ts
import { composeExtensions } from "rotaguide-spotlight";

const combined = composeExtensions(analytics, accessControl, customThemeResolver);
```

### 3.7 Zero-config usage (unchanged)

Existing code continues to work with zero changes:

```tsx
import { MarkdownGuideButton } from "rotaguide-spotlight";
import "rotaguide-spotlight/style.css";

<MarkdownGuideButton content={markdown} />
```

---

## 4. Extension / Plugin Design

### 4.1 The `SpotlightExtension` interface

```ts
interface SpotlightExtension {
  name: string;

  // Lifecycle hooks
  canStartGuide?(event: GuideLifecycleEvent): boolean | Promise<boolean>;
  onGuideStart?(event: GuideLifecycleEvent): void;
  onStepChange?(event: StepLifecycleEvent): void;
  onGuideComplete?(event: GuideCompleteEvent): void;
  onGuideClose?(event: GuideCloseEvent): void;

  // Transform hooks
  transformGuide?(guide: GuideDefinition): GuideDefinition;
  transformStep?(step: GuideStep, index: number, guide: GuideDefinition): GuideStep;

  // Resolution hooks
  resolveTheme?(theme: GuideTheme, step: GuideStep | undefined, guide: GuideDefinition): GuideTheme;
  resolveI18n?(i18n: GuideI18n, step: GuideStep | undefined, guide: GuideDefinition): GuideI18n;
  resolveTargetSelector?(target: string): string | undefined;

  // Render overrides
  renderTooltipBody?(context: TooltipRenderContext): ReactNode | undefined;
  renderCompletedScreen?(context: CompletedRenderContext): ReactNode | undefined;
  wrapOverlay?(overlay: ReactNode, guide: GuideDefinition): ReactNode;
}
```

### 4.2 Why this design?

1. **Flat, not nested** — No plugin-of-plugins, no middleware chains. One interface to learn.
2. **All optional** — Implement only what you need. An analytics extension only needs lifecycle hooks.
3. **No class required** — Plain object. `defineExtension({...})` is a typed identity helper.
4. **Composable** — `composeExtensions()` merges multiple extensions with clear, predictable rules.
5. **No registration** — Pass directly as `extension` prop, or bundle in `createSpotlight()`, or provide via `SpotlightProvider`.
6. **Return undefined = skip** — Render overrides return `undefined` to fall through to default rendering. No need to re-implement the whole tooltip.
7. **Async-capable where needed** — `canStartGuide` can be async for API-based access checks.

### 4.3 Example extensions

**Access control:**
```ts
const accessControl = defineExtension({
  name: "access-control",
  async canStartGuide({ guideId }) {
    const allowed = await checkPermission(guideId);
    return allowed;
  },
});
```

**Custom target resolver (for component library):**
```ts
const myComponentResolver = defineExtension({
  name: "my-component-ids",
  resolveTargetSelector(target) {
    if (target.startsWith("comp:")) {
      return `[data-my-component-id="${target.slice(5)}"]`;
    }
    return undefined; // fall through to core
  },
});
```

**Guide source enrichment:**
```ts
const enrichGuides = defineExtension({
  name: "enrich-guides",
  transformGuide(guide) {
    return {
      ...guide,
      meta: { ...guide.meta, theme: { ...guide.meta.theme, fontFamily: "'Inter'" } },
    };
  },
  transformStep(step, index, guide) {
    return { ...step, description: `${step.description} (Step ${index + 1})` };
  },
});
```

**Custom completed screen:**
```tsx
const customCompleted = defineExtension({
  name: "custom-completed",
  renderCompletedScreen({ guide, close }) {
    return (
      <div style={{ textAlign: "center", padding: 24 }}>
        <h3>🎉 You finished {guide.meta.title}!</h3>
        <button onClick={close}>Close</button>
      </div>
    );
  },
});
```

---

## 5. Suggested Folder Structures

### A. Public RotaGuide Spotlight repo (current)

```
rotaguide-spotlight/
├── src/
│   ├── index.ts              # Public exports
│   ├── types.ts              # Core type definitions
│   ├── extensions.ts         # SpotlightExtension interface + compose
│   ├── spotlight.ts          # createSpotlight, defineGuide, definePreset
│   ├── SpotlightContext.tsx   # React context provider
│   ├── SpotlightGuideOverlay.tsx
│   ├── MarkdownGuideButton.tsx
│   ├── MarkdownGuideTrigger.tsx
│   ├── parser.ts
│   ├── validate.ts
│   ├── dom.ts
│   ├── helpers.ts
│   ├── errors.ts
│   └── style.css
├── examples/
│   └── simple-react/         # Working example with extension demos
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

### B. Consumer app using RotaGuide Spotlight directly

```
my-app/
├── src/
│   ├── spotlight/
│   │   ├── instance.ts         # createSpotlight({ preset, extensions })
│   │   ├── preset.ts           # definePreset({ theme, extensions })
│   │   └── extensions/
│   │       ├── analytics.ts    # defineExtension({ name: "analytics", ... })
│   │       └── access-control.ts
│   ├── guides/
│   │   ├── onboarding.guide.md
│   │   └── create-booking.guide.yaml
│   ├── App.tsx                 # <SpotlightProvider instance={spotlight}>
│   └── ...
```

### C. Private branded package

```
@acme/spotlight/
├── src/
│   ├── index.ts               # Re-exports core + preset + extensions
│   ├── preset.ts              # definePreset with Acme brand
│   ├── instance.ts            # createSpotlight with Acme defaults
│   ├── extensions/
│   │   ├── analytics.ts       # Acme analytics integration
│   │   ├── permissions.ts     # Acme RBAC checks
│   │   └── custom-tooltip.tsx # Acme-branded tooltip body
│   └── components/
│       └── AcmeGuideButton.tsx # Wrapper around MarkdownGuideButton
├── package.json               # peerDependency: "rotaguide-spotlight"
└── tsconfig.json
```

Consumer usage:
```tsx
import { AcmeGuideButton, acmeSpotlight } from "@acme/spotlight";

<SpotlightProvider instance={acmeSpotlight}>
  <AcmeGuideButton content={guideMarkdown} />
</SpotlightProvider>
```

### D. Monorepo setup (optional, not required)

```
monorepo/
├── packages/
│   ├── spotlight-core/         # Fork/mirror of rotaguide-spotlight (or npm dep)
│   ├── spotlight-preset-acme/  # @acme/spotlight-preset
│   │   ├── src/preset.ts
│   │   └── src/extensions/
│   ├── spotlight-ext-analytics/# @acme/spotlight-ext-analytics
│   │   └── src/index.ts
│   └── app/                    # The consuming application
│       └── src/spotlight/instance.ts
├── package.json
└── turbo.json / pnpm-workspace.yaml
```

---

## 6. What Should Stay in Core vs. What Should Move Out

| Item | Classification | Why |
|---|---|---|
| `SpotlightGuideOverlay` | **Core** | Generic rendering engine |
| `MarkdownGuideButton` / `MarkdownGuideTrigger` | **Core** | Generic trigger components |
| Markdown / JSON / YAML parser | **Core** | Format-agnostic parsing |
| `GuideDefinition` / `GuideStep` types | **Core** | The contract |
| Default tooltip templates (CSS) | **Core** | Sensible defaults |
| `guideTarget()` helper | **Core** | DX convenience |
| Built-in i18n (en, tr, da) | **Core** | Sensible defaults |
| `SpotlightExtension` interface | **Core** | Extension contract |
| `createSpotlight` / `definePreset` | **Core** | Builder APIs |
| `composeExtensions` | **Core** | Composition utility |
| `SpotlightProvider` | **Core** | React integration |
| Specific company analytics | **Consumer** | Private concern |
| RBAC / permission checks | **Consumer** | Private concern |
| Custom branded tooltip UI | **Consumer** | Private concern |
| Feature flag gating | **Consumer** | Private concern |
| Guide packs for a specific product | **Consumer** | Private concern |
| CMS/API guide loaders | **Consumer** | Private concern |
| Progress persistence to localStorage/API | **Consumer** | Private concern |
| Product-specific wrapper components | **Consumer** | Private concern |
| Custom selector schemes (`comp:`, `page:`) | **Consumer** | Private concern |

---

## 7. Migration Plan

This is an **incremental, backward-compatible migration**. No rewrite needed.

### Phase 1: Foundation (done ✅)

- [x] Create `extensions.ts` with `SpotlightExtension` interface
- [x] Create `defineExtension()` and `composeExtensions()`
- [x] Create `spotlight.ts` with `createSpotlight()`, `definePreset()`, `defineGuide()`
- [x] Create `SpotlightContext.tsx` with `SpotlightProvider`
- [x] Add `instance` and `extension` props to `SpotlightGuideOverlay`
- [x] Add `instance` and `extension` props to `MarkdownGuideButton` and `MarkdownGuideTrigger`
- [x] Wire lifecycle hooks into overlay effects
- [x] Wire render overrides into overlay JSX
- [x] Wire extension-aware `resolveTargetSelector`
- [x] Export everything from `index.ts`
- [x] Add extension demo to example app
- [x] Verify all existing tests/builds pass

**Breaking changes: None.** All new props are optional. All existing usage is unchanged.

### Phase 2: Refinement (next release)

- [ ] Wire `resolveTheme` and `resolveI18n` extension hooks into the theme/text resolution pipeline
- [ ] Wire `canStartGuide` into `MarkdownGuideButton` and `MarkdownGuideTrigger` (show loading state while checking)
- [ ] Wire `transformStep` per-step in the overlay rendering loop
- [ ] Add `onBeforeStepChange` hook (for validation / confirmation)
- [ ] Consider `useSpotlightGuide()` hook for imperative control
- [ ] Add more extension examples to the example app

### Phase 3: Polish (future)

- [ ] Publish separate `@rotaguide/spotlight-ext-analytics` example package
- [ ] Publish `@rotaguide/spotlight-preset-starter` example preset
- [ ] Add extension documentation to README
- [ ] Consider a `createGuideLoader()` helper for async guide fetching
- [ ] Consider headless mode (overlay logic without default UI)

### Migration rules

1. **Never break the zero-arg path.** `<MarkdownGuideButton content={md} />` must always work.
2. **Extension hooks are always optional.** The overlay must render correctly with no extensions.
3. **New props are always optional.** No existing consumer needs to change anything.
4. **Version according to semver.** Phase 1 is a minor version bump (new features, no breaks).
5. **Test with and without extensions.** Every build should verify both paths.

---

## 8. Tradeoffs and Risks

### Risks

| Risk | Mitigation |
|---|---|
| **Extension API becomes too large** | Keep it as one flat interface. Resist splitting into sub-interfaces until there's clear need. |
| **Plugin complexity scares simple users** | Extensions are invisible by default. Zero-config path is unchanged. No "you must register plugins" ceremony. |
| **Render overrides fragment the UI** | `renderTooltipBody` and `renderCompletedScreen` are escape hatches, not the primary customization path. Theme/CSS vars remain the recommended way. |
| **Extension contract versioning** | The `SpotlightExtension` interface is the contract. Adding optional fields is non-breaking. Removing or changing field signatures is a major version bump. |
| **Leaking private concerns into core** | The classification table above is the guardrail. If a feature only makes sense for one company, it's an extension. |
| **`composeExtensions` ordering confusion** | Document clearly: lifecycle hooks call in order, transforms pipe in order, render overrides use first non-undefined. |
| **Wrapper package maintenance burden** | Wrapper packages are thin — they mostly re-export core + preset. If core changes, they rarely need updates. |
| **`canStartGuide` async adds complexity** | It's the only async hook. Keep it simple: if it rejects/returns false, don't open. No retry logic in core. |

### Design decisions not taken (and why)

| Alternative | Why not |
|---|---|
| Class-based plugin system | Too ceremonious. A plain object with optional methods is simpler and more tree-shakeable. |
| Middleware chain (like Express) | Overkill for the number of extension points. A flat hook bag is easier to understand. |
| Event emitter pattern | Requires subscribe/unsubscribe ceremony. Direct hooks on the extension object are simpler. |
| Separate `resolveTheme` from extension | Fewer concepts is better. Theme resolution is just another hook on the extension. |
| Separate package for extension types | Not worth the maintenance. Types live alongside the runtime in `extensions.ts`. |
| `createPlugin()` with `install()` method | Vue-style plugin installation adds ceremony without benefit for this library's scope. |

---

## 9. Final Recommendation

**Ship Phase 1 now.** The foundation is implemented, compiles, builds, and is backward-compatible.

The recommended architecture for RotaGuide Spotlight is:

> **A single-package core with a flat extension interface, optional context provider, and composition utilities.**

Specifically:

1. **Keep one npm package** (`rotaguide-spotlight`). Don't split into `@rotaguide/core` + `@rotaguide/react` yet — the user base doesn't justify it.

2. **The `SpotlightExtension` interface is the entire plugin API.** One interface, all optional fields, well-defined composition rules. This is the thing consumers learn. Everything else follows from it.

3. **Three ways to provide extensions** (from simplest to most structured):
   - `extension` prop on any component (for single-use inline extensions)
   - `instance` prop on any component (for pre-configured instances)
   - `<SpotlightProvider>` context (for app-wide configuration)

4. **`definePreset()` is the recommended way for organizations to package their customizations.** A preset bundles theme + i18n + extensions into one importable object that any team member can use without understanding the internals.

5. **Don't over-abstract.** The current codebase is ~2000 lines of well-organized TypeScript. The extension system adds ~300 lines. This is the right level of complexity for a library maintained by one person or a small team.

6. **Let consumers own their complexity.** Core provides the hooks. Consumers decide whether they need one extension or ten. Core doesn't care.

This design gives RotaGuide Spotlight the qualities of a polished open-source library:
- **Easy to start**: `npm install rotaguide-spotlight` → `<MarkdownGuideButton content={md} />`
- **Easy to customize**: `createSpotlight({ theme, extensions })`
- **Easy to brand**: `definePreset({ name: "acme", ... })`
- **Easy to extend**: `defineExtension({ name: "analytics", onGuideStart() { ... } })`
- **Easy to wrap**: Build `@acme/spotlight` that re-exports core + your preset
- **Easy to maintain**: All extension logic lives outside core. Core stays generic.
