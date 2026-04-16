export { MarkdownGuideButton } from "./MarkdownGuideButton";
export type { MarkdownGuideButtonProps } from "./MarkdownGuideButton";
export { MarkdownGuideTrigger } from "./MarkdownGuideTrigger";
export type {
  GuideTriggerEvent,
  MarkdownGuideTriggerProps,
  MarkdownGuideTriggerRenderParams,
} from "./MarkdownGuideTrigger";

export { SpotlightGuideOverlay } from "./SpotlightGuideOverlay";
export type { SpotlightGuideOverlayProps } from "./SpotlightGuideOverlay";

export {
  parseGuideContent,
  parseGuideContentSafe,
  parseGuideMarkdown,
  parseGuideMarkdownSafe,
} from "./parser";
export { GuideParseError, formatGuideIssues } from "./errors";
export { guideTarget } from "./helpers";

// --- Extension system ---
export {
  defineExtension,
  composeExtensions,
} from "./extensions";
export type {
  SpotlightExtension,
  GuideLifecycleEvent,
  StepLifecycleEvent,
  GuideCompleteEvent,
  GuideCloseEvent,
  TooltipRenderContext,
  CompletedRenderContext,
} from "./extensions";

// --- Spotlight instance & presets ---
export {
  createSpotlight,
  defineGuide,
  definePreset,
} from "./spotlight";
export type {
  SpotlightConfig,
  SpotlightInstance,
  SpotlightPreset,
} from "./spotlight";

// --- React context ---
export { SpotlightProvider, useSpotlightInstance } from "./SpotlightContext";
export type { SpotlightProviderProps } from "./SpotlightContext";

export {
  GUIDE_KINDS,
  GUIDE_ADVANCE_MODES,
  GUIDE_SOURCE_FORMATS,
  GUIDE_HIGHLIGHT_STYLES,
  GUIDE_HIGHLIGHT_ANIMATIONS,
  GUIDE_PRIMARY_ACTIONS,
  GUIDE_TEXT_TRANSFORMS,
  GUIDE_TOOLTIP_PLACEMENTS,
  GUIDE_TOOLTIP_TEMPLATES,
  GUIDE_TARGET_ATTENTIONS,
  type GuideAdvanceMode,
  type GuideActions,
  type GuideDefinition,
  type GuideHighlightAnimation,
  type GuideHighlightStyle,
  type GuideI18n,
  type GuideSourceFormat,
  type GuideIssue,
  type GuideKind,
  type GuideMeta,
  type GuidePills,
  type GuidePrimaryAction,
  type GuideStep,
  type GuideTargetAttention,
  type GuideTextTransform,
  type GuideTooltipPlacement,
  type GuideTheme,
  type GuideTooltipTemplate,
} from "./types";
