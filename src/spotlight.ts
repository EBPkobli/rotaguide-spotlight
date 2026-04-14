import type { GuideDefinition, GuideTheme, GuideI18n, GuideTooltipTemplate } from "./types";
import type { SpotlightExtension } from "./extensions";
import { composeExtensions } from "./extensions";

// ---------------------------------------------------------------------------
// Preset — a reusable bundle of defaults + extensions
// ---------------------------------------------------------------------------

export interface SpotlightPreset {
  /** Preset name for debugging. */
  name: string;
  /** Default theme applied to all guides unless overridden. */
  theme?: GuideTheme;
  /** Default i18n applied to all guides unless overridden. */
  i18n?: GuideI18n;
  /** Default tooltip template. */
  tooltipTemplate?: GuideTooltipTemplate;
  /** Extensions bundled with this preset. */
  extensions?: SpotlightExtension[];
}

/**
 * Define a preset — a reusable bundle of theme, i18n defaults, and extensions.
 *
 * @example
 * ```ts
 * const myPreset = definePreset({
 *   name: "acme-brand",
 *   theme: { primaryButtonBackgroundColor: "#e11d48" },
 *   tooltipTemplate: "contrast",
 *   extensions: [analyticsExtension, accessControlExtension],
 * });
 * ```
 */
export function definePreset(preset: SpotlightPreset): SpotlightPreset {
  return preset;
}

// ---------------------------------------------------------------------------
// Spotlight instance configuration
// ---------------------------------------------------------------------------

export interface SpotlightConfig {
  /** Extensions to apply globally. */
  extensions?: SpotlightExtension[];
  /** Preset to apply (theme, i18n, and bundled extensions). */
  preset?: SpotlightPreset;
  /** Default tooltip template when not specified in guide. */
  tooltipTemplate?: GuideTooltipTemplate;
  /** Default theme. */
  theme?: GuideTheme;
  /** Default i18n. */
  i18n?: GuideI18n;
  /** Default z-index for the overlay. */
  zIndex?: number;
}

// ---------------------------------------------------------------------------
// Spotlight instance — the resolved runtime config
// ---------------------------------------------------------------------------

export interface SpotlightInstance {
  /** The merged extension (all extensions composed together). */
  extension: SpotlightExtension;
  /** Resolved default theme. */
  theme: GuideTheme;
  /** Resolved default i18n. */
  i18n: GuideI18n;
  /** Resolved default tooltip template. */
  tooltipTemplate: GuideTooltipTemplate | undefined;
  /** Resolved z-index. */
  zIndex: number | undefined;
  /** The original config for reference. */
  config: SpotlightConfig;
}

const NOOP_EXTENSION: SpotlightExtension = { name: "noop" };

/**
 * Create a configured Spotlight instance. This is the main entry point for
 * advanced consumers who want to bundle extensions, presets, themes, etc.
 *
 * @example
 * ```ts
 * // Simple — no extensions:
 * const spotlight = createSpotlight();
 *
 * // With extensions:
 * const spotlight = createSpotlight({
 *   extensions: [analyticsExtension],
 *   theme: { primaryButtonBackgroundColor: "#e11d48" },
 * });
 *
 * // With a preset:
 * const spotlight = createSpotlight({
 *   preset: acmePreset,
 *   extensions: [extraExtension],
 * });
 * ```
 */
export function createSpotlight(config: SpotlightConfig = {}): SpotlightInstance {
  const presetExtensions = config.preset?.extensions ?? [];
  const directExtensions = config.extensions ?? [];
  const allExtensions = [...presetExtensions, ...directExtensions];

  const extension =
    allExtensions.length === 0
      ? NOOP_EXTENSION
      : allExtensions.length === 1
      ? allExtensions[0]
      : composeExtensions(...allExtensions);

  const theme: GuideTheme = {
    ...(config.preset?.theme ?? {}),
    ...(config.theme ?? {}),
  };

  const i18n: GuideI18n = {
    ...(config.preset?.i18n ?? {}),
    ...(config.i18n ?? {}),
  };

  const tooltipTemplate =
    config.tooltipTemplate ?? config.preset?.tooltipTemplate ?? undefined;

  return {
    extension,
    theme,
    i18n,
    tooltipTemplate,
    zIndex: config.zIndex,
    config,
  };
}

// ---------------------------------------------------------------------------
// defineGuide — typed identity helper
// ---------------------------------------------------------------------------

/**
 * Define a guide with full type safety. This is a typed identity function.
 *
 * @example
 * ```ts
 * const bookingGuide = defineGuide({
 *   meta: { id: "create-booking", title: "Create a Booking" },
 *   steps: [
 *     { id: "step-1", target: "booking-btn", title: "Click here", kind: "Action", description: "Start the flow" },
 *   ],
 * });
 * ```
 */
export function defineGuide(guide: GuideDefinition): GuideDefinition {
  return guide;
}
