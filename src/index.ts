export { MarkdownGuideButton } from "./MarkdownGuideButton";
export type { MarkdownGuideButtonProps } from "./MarkdownGuideButton";

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

export {
  GUIDE_KINDS,
  GUIDE_ADVANCE_MODES,
  GUIDE_SOURCE_FORMATS,
  GUIDE_HIGHLIGHT_STYLES,
  GUIDE_HIGHLIGHT_ANIMATIONS,
  GUIDE_TOOLTIP_PLACEMENTS,
  GUIDE_TOOLTIP_TEMPLATES,
  type GuideAdvanceMode,
  type GuideDefinition,
  type GuideHighlightAnimation,
  type GuideHighlightStyle,
  type GuideI18n,
  type GuideSourceFormat,
  type GuideIssue,
  type GuideKind,
  type GuideMeta,
  type GuideStep,
  type GuideTooltipPlacement,
  type GuideTheme,
  type GuideTooltipTemplate,
} from "./types";
