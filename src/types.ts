export const GUIDE_KINDS = [
  "Filter",
  "Toggle",
  "Action",
  "Input",
  "Tab",
  "List",
  "Map Interaction",
] as const;

export const GUIDE_ADVANCE_MODES = ["auto", "click", "change", "input-idle", "none"] as const;
export const GUIDE_SOURCE_FORMATS = ["auto", "markdown", "json", "yaml"] as const;
export const GUIDE_HIGHLIGHT_STYLES = ["line", "dash"] as const;
export const GUIDE_HIGHLIGHT_ANIMATIONS = [
  "none",
  "color",
  "dash",
  "color-dash",
] as const;
export const GUIDE_STEP_PILL_POSITIONS = ["top", "title", "bottom"] as const;
export const GUIDE_PRIMARY_ACTIONS = ["back", "next", "skip"] as const;
export const GUIDE_TEXT_TRANSFORMS = [
  "none",
  "uppercase",
  "lowercase",
  "capitalize",
] as const;
export const GUIDE_TOOLTIP_PLACEMENTS = [
  "auto",
  "top",
  "right",
  "bottom",
  "left",
] as const;
export const GUIDE_TOOLTIP_TEMPLATES = [
  "default",
  "glass",
  "minimal",
  "contrast",
  "dashboard-orange",
  "clean-white",
  "commerce-dark",
  "terminal-pop",
  "outline-light",
] as const;

export type GuideKind = (typeof GUIDE_KINDS)[number];
export type GuideAdvanceMode = (typeof GUIDE_ADVANCE_MODES)[number];
export type GuideSourceFormat = (typeof GUIDE_SOURCE_FORMATS)[number];
export type GuideHighlightStyle = (typeof GUIDE_HIGHLIGHT_STYLES)[number];
export type GuideHighlightAnimation = (typeof GUIDE_HIGHLIGHT_ANIMATIONS)[number];
export type GuidePrimaryAction = (typeof GUIDE_PRIMARY_ACTIONS)[number];
export type GuideStepPillPosition = (typeof GUIDE_STEP_PILL_POSITIONS)[number];
export type GuideTextTransform = (typeof GUIDE_TEXT_TRANSFORMS)[number];
export type GuideTooltipPlacement = (typeof GUIDE_TOOLTIP_PLACEMENTS)[number];
export type GuideTooltipTemplate = (typeof GUIDE_TOOLTIP_TEMPLATES)[number];

export interface GuidePills {
  showStepProgress?: boolean;
  showKind?: boolean;
  stepPillPosition?: GuideStepPillPosition;
}

export interface GuideActions {
  showClose?: boolean;
  showBack?: boolean;
  showNext?: boolean;
  showSkip?: boolean;
  primaryAction?: GuidePrimaryAction;
}

export interface GuideI18n {
  locale?: string;
  stepProgressLabel?: string; // Example: "Step {current}/{total}"
  backButtonLabel?: string;
  nextButtonLabel?: string;
  closeButtonLabel?: string;
  skipButtonLabel?: string;
  finishButtonLabel?: string;
  targetMissingMessage?: string; // Example: "Target not found in DOM: {target}"
  followHighlightMessage?: string;
  followTargetMessage?: string;
  requireClickMessage?: string;
  requireInputMessage?: string;
  clickHighlightedMessage?: string;
  autoAdvanceMessage?: string; // Example: "Auto advancing in {seconds}s"
  completedTitleTemplate?: string; // Example: "{title} completed"
  completedDescription?: string;
}

export interface GuideTheme {
  tooltipTemplate?: GuideTooltipTemplate;
  fontFamily?: string;
  tooltipBackgroundColor?: string;
  tooltipTextColor?: string;
  tooltipBorderColor?: string;
  tooltipBorderRadius?: number;
  tooltipShadow?: string;
  titleColor?: string;
  descriptionColor?: string;
  hintColor?: string;
  warningColor?: string;
  stepPillBackgroundColor?: string;
  stepPillTextColor?: string;
  kindPillBackgroundColor?: string;
  kindPillTextColor?: string;
  pillFontSize?: number;
  pillFontWeight?: number;
  pillLetterSpacing?: string;
  pillTextTransform?: GuideTextTransform;
  primaryButtonBackgroundColor?: string;
  primaryButtonTextColor?: string;
  primaryButtonBorderColor?: string;
  primaryButtonHoverBackgroundColor?: string;
  primaryButtonHoverBorderColor?: string;
  ghostButtonBackgroundColor?: string;
  ghostButtonTextColor?: string;
  ghostButtonBorderColor?: string;
  timerTrackColor?: string;
  timerFillColor?: string;
}

export interface GuideMeta {
  id: string;
  title: string;
  buttonLabel?: string;
  tooltipTitle?: string;
  tooltipPlacement?: GuideTooltipPlacement;
  overlayColor?: string;
  highlightColor?: string;
  highlightPadding?: number;
  highlightBorderRadius?: number;
  tooltipWidth?: number;
  showHighlight?: boolean;
  draggable?: boolean;
  highlightStyle?: GuideHighlightStyle;
  highlightAnimation?: GuideHighlightAnimation;
  tooltipTemplate?: GuideTooltipTemplate;
  finishAnimation?: boolean;
  overlayLock?: boolean;
  showFollowHint?: boolean;
  i18n?: GuideI18n;
  pills?: GuidePills;
  actions?: GuideActions;
  theme?: GuideTheme;
}

export interface GuideStep {
  id: string;
  target: string;
  targets?: string[];
  title: string;
  kind: GuideKind;
  description: string;
  tooltipPlacement?: GuideTooltipPlacement;
  allowSkip?: boolean;
  skippable?: boolean;
  advanceOn?: GuideAdvanceMode;
  inputIdleMs?: number;
  showHighlight?: boolean;
  highlightColor?: string;
  highlightPadding?: number;
  highlightBorderRadius?: number;
  draggable?: boolean;
  highlightStyle?: GuideHighlightStyle;
  highlightAnimation?: GuideHighlightAnimation;
  tooltipTemplate?: GuideTooltipTemplate;
  autoAdvanceMs?: number;
  showAutoAdvanceProgress?: boolean;
  mustClickTarget?: boolean;
  mustEnterValue?: boolean;
  overlayLock?: boolean;
  showFollowHint?: boolean;
  i18n?: GuideI18n;
  pills?: GuidePills;
  actions?: GuideActions;
  theme?: GuideTheme;
}

export interface GuideDefinition {
  meta: GuideMeta;
  steps: GuideStep[];
}

export interface GuideIssue {
  code:
    | "MD_EMPTY"
    | "MD_FRONTMATTER_INVALID"
    | "MD_STEP_BLOCK_MISSING"
    | "MD_STEP_BLOCK_INVALID"
    | "MD_STEP_JSON_INVALID"
    | "GUIDE_META_MISSING_TITLE"
    | "GUIDE_STEP_EMPTY"
    | "GUIDE_STEP_MISSING_FIELD"
    | "GUIDE_STEP_INVALID_KIND"
    | "GUIDE_STEP_INVALID_ADVANCE"
    | "GUIDE_SOURCE_INVALID"
    | "GUIDE_META_INVALID_FIELD"
    | "GUIDE_STEP_INVALID_FIELD"
    | "GUIDE_STEP_DUPLICATE_ID";
  message: string;
  line?: number;
  hint?: string;
}
