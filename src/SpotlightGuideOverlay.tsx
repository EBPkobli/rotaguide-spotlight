import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type {
  GuideActions,
  GuideDefinition,
  GuideHighlightAnimation,
  GuideHighlightStyle,
  GuideI18n,
  GuidePills,
  GuidePrimaryAction,
  GuideStep,
  GuideTheme,
  GuideTooltipPlacement,
  GuideTooltipTemplate,
} from "./types";
import { getRectForElement, isElementVisible, resolveTargetSelector as coreResolveTargetSelector, type TargetRect } from "./dom";
import type {
  SpotlightExtension,
  GuideLifecycleEvent,
  StepLifecycleEvent,
  GuideCompleteEvent,
  GuideCloseEvent,
} from "./extensions";
import type { SpotlightInstance } from "./spotlight";
import { useSpotlightInstance } from "./SpotlightContext";

export interface SpotlightGuideOverlayProps {
  open: boolean;
  guide: GuideDefinition;
  onClose: () => void;
  zIndex?: number;
  className?: string;
  /** Spotlight instance for extensions/presets. Overrides context if provided. */
  instance?: SpotlightInstance;
  /** Inline extension (convenience shortcut — no instance needed). */
  extension?: SpotlightExtension;
}

interface Position {
  left: number;
  top: number;
}

interface DragState {
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
}

const DEFAULT_OVERLAY_COLOR = "rgba(0, 43, 69, 0.22)";
const DEFAULT_HIGHLIGHT_COLOR = "rgb(255, 199, 0)";
const DEFAULT_HIGHLIGHT_STYLE: GuideHighlightStyle = "line";
const DEFAULT_HIGHLIGHT_ANIMATION: GuideHighlightAnimation = "none";
const DEFAULT_TOOLTIP_TEMPLATE: GuideTooltipTemplate = "clean-white";
const DEFAULT_TOOLTIP_WIDTH = 360;
const DEFAULT_TOOLTIP_HEIGHT = 260;
const DEFAULT_INPUT_IDLE_MS = 1500;
const DEFAULT_HIGHLIGHT_PADDING_PX = 1;
const HIGHLIGHT_STROKE_WIDTH_PX = 4;
const DEFAULT_HIGHLIGHT_BORDER_RADIUS_PX = 10;
const TOOLTIP_MARGIN_PX = 16;
const TOOLTIP_GAP_PX = 12;
const OVERLAY_OPEN_EVENT = "msgt:overlay-open";
const MIN_OVERLAY_Z_INDEX = 2147483000;
type ResolvedAdvanceMode = "click" | "change" | "input-idle" | "none";

function getViewportSize() {
  if (typeof document !== "undefined") {
    const { clientWidth, clientHeight } = document.documentElement;
    if (clientWidth > 0 && clientHeight > 0) {
      return { width: clientWidth, height: clientHeight };
    }
  }

  if (typeof window !== "undefined") {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  return { width: 0, height: 0 };
}

interface StepRequirements {
  requireClick: boolean;
  requireInput: boolean;
}

interface TooltipActionButton {
  key: GuidePrimaryAction;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

interface GuideTextSet {
  stepProgressLabel: string;
  backButtonLabel: string;
  nextButtonLabel: string;
  closeButtonLabel: string;
  skipButtonLabel: string;
  finishButtonLabel: string;
  targetMissingMessage: string;
  followHighlightMessage: string;
  followTargetMessage: string;
  requireClickMessage: string;
  requireInputMessage: string;
  clickHighlightedMessage: string;
  autoAdvanceMessage: string;
  completedTitleTemplate: string;
  completedDescription: string;
}

type TooltipStyleVars = CSSProperties & {
  "--msgt-font-family"?: string;
  "--msgt-tooltip-bg"?: string;
  "--msgt-tooltip-text"?: string;
  "--msgt-tooltip-border"?: string;
  "--msgt-tooltip-border-radius"?: string;
  "--msgt-tooltip-shadow"?: string;
  "--msgt-title-color"?: string;
  "--msgt-description-color"?: string;
  "--msgt-hint-color"?: string;
  "--msgt-warning-color"?: string;
  "--msgt-pill-step-bg"?: string;
  "--msgt-pill-step-text"?: string;
  "--msgt-pill-kind-bg"?: string;
  "--msgt-pill-kind-text"?: string;
  "--msgt-pill-font-size"?: string;
  "--msgt-pill-font-weight"?: string;
  "--msgt-pill-letter-spacing"?: string;
  "--msgt-pill-text-transform"?: string;
  "--msgt-btn-primary-bg"?: string;
  "--msgt-btn-primary-text"?: string;
  "--msgt-btn-primary-border"?: string;
  "--msgt-btn-primary-hover-bg"?: string;
  "--msgt-btn-primary-hover-border"?: string;
  "--msgt-btn-ghost-bg"?: string;
  "--msgt-btn-ghost-text"?: string;
  "--msgt-btn-ghost-border"?: string;
  "--msgt-timer-track-bg"?: string;
  "--msgt-timer-fill-bg"?: string;
};

const GUIDE_TEXTS_EN: GuideTextSet = {
  stepProgressLabel: "Step {current}/{total}",
  backButtonLabel: "Back",
  nextButtonLabel: "Next",
  closeButtonLabel: "Close",
  skipButtonLabel: "Skip",
  finishButtonLabel: "Finish",
  targetMissingMessage: "Target not found in DOM: {target}",
  followHighlightMessage: "Follow the highlighted target to continue.",
  followTargetMessage: "Follow the target element to continue.",
  requireClickMessage: "This step requires clicking the target area.",
  requireInputMessage: "This step requires entering a value in the target input.",
  clickHighlightedMessage: "Click the yellow highlighted area to continue.",
  autoAdvanceMessage: "Auto advancing in {seconds}s",
  completedTitleTemplate: "{title} completed",
  completedDescription: "Guide is complete. You can now run this flow yourself.",
};

const GUIDE_TEXTS_TR: GuideTextSet = {
  stepProgressLabel: "Adım {current}/{total}",
  backButtonLabel: "Geri",
  nextButtonLabel: "İleri",
  closeButtonLabel: "Kapat",
  skipButtonLabel: "Geç",
  finishButtonLabel: "Bitir",
  targetMissingMessage: "Hedef DOM içinde bulunamadı: {target}",
  followHighlightMessage: "Devam etmek için vurgulanan hedefi takip et.",
  followTargetMessage: "Devam etmek için hedef elementi takip et.",
  requireClickMessage: "Bu adımda hedef alana tıklanması zorunludur.",
  requireInputMessage: "Bu adımda hedef alana değer girilmesi zorunludur.",
  clickHighlightedMessage: "Devam etmek için sarı vurgulu alana tıkla.",
  autoAdvanceMessage: "{seconds}s içinde otomatik ilerleniyor",
  completedTitleTemplate: "{title} tamamlandı",
  completedDescription: "Rehber tamamlandı. Akışı artık kendin uygulayabilirsin.",
};

const GUIDE_TEXTS_DA: GuideTextSet = {
  stepProgressLabel: "Trin {current}/{total}",
  backButtonLabel: "Tilbage",
  nextButtonLabel: "Næste",
  closeButtonLabel: "Luk",
  skipButtonLabel: "Spring over",
  finishButtonLabel: "Afslut",
  targetMissingMessage: "Målet blev ikke fundet i DOM: {target}",
  followHighlightMessage: "Følg det fremhævede mål for at fortsætte.",
  followTargetMessage: "Følg mål-elementet for at fortsætte.",
  requireClickMessage: "Dette trin kræver klik på målområdet.",
  requireInputMessage: "Dette trin kræver, at du indtaster en værdi i målfeltet.",
  clickHighlightedMessage: "Klik på det gule fremhævede område for at fortsætte.",
  autoAdvanceMessage: "Fortsætter automatisk om {seconds}s",
  completedTitleTemplate: "{title} fuldført",
  completedDescription: "Guiden er fuldført. Nu kan du selv køre flowet.",
};

function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (full, key) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return String(values[key]);
    }
    return full;
  });
}

function resolveGuideTexts(metaI18n?: GuideI18n, stepI18n?: GuideI18n): GuideTextSet {
  const localeRaw = (stepI18n?.locale ?? metaI18n?.locale ?? "en").toLowerCase();
  const base = localeRaw.startsWith("da")
    ? GUIDE_TEXTS_DA
    : localeRaw.startsWith("tr")
    ? GUIDE_TEXTS_TR
    : GUIDE_TEXTS_EN;
  return {
    stepProgressLabel:
      stepI18n?.stepProgressLabel ??
      metaI18n?.stepProgressLabel ??
      base.stepProgressLabel,
    backButtonLabel:
      stepI18n?.backButtonLabel ??
      metaI18n?.backButtonLabel ??
      base.backButtonLabel,
    nextButtonLabel:
      stepI18n?.nextButtonLabel ??
      metaI18n?.nextButtonLabel ??
      base.nextButtonLabel,
    closeButtonLabel:
      stepI18n?.closeButtonLabel ??
      metaI18n?.closeButtonLabel ??
      base.closeButtonLabel,
    skipButtonLabel:
      stepI18n?.skipButtonLabel ??
      metaI18n?.skipButtonLabel ??
      base.skipButtonLabel,
    finishButtonLabel:
      stepI18n?.finishButtonLabel ??
      metaI18n?.finishButtonLabel ??
      base.finishButtonLabel,
    targetMissingMessage:
      stepI18n?.targetMissingMessage ??
      metaI18n?.targetMissingMessage ??
      base.targetMissingMessage,
    followHighlightMessage:
      stepI18n?.followHighlightMessage ??
      metaI18n?.followHighlightMessage ??
      base.followHighlightMessage,
    followTargetMessage:
      stepI18n?.followTargetMessage ??
      metaI18n?.followTargetMessage ??
      base.followTargetMessage,
    requireClickMessage:
      stepI18n?.requireClickMessage ??
      metaI18n?.requireClickMessage ??
      base.requireClickMessage,
    requireInputMessage:
      stepI18n?.requireInputMessage ??
      metaI18n?.requireInputMessage ??
      base.requireInputMessage,
    clickHighlightedMessage:
      stepI18n?.clickHighlightedMessage ??
      metaI18n?.clickHighlightedMessage ??
      base.clickHighlightedMessage,
    autoAdvanceMessage:
      stepI18n?.autoAdvanceMessage ??
      metaI18n?.autoAdvanceMessage ??
      base.autoAdvanceMessage,
    completedTitleTemplate:
      stepI18n?.completedTitleTemplate ??
      metaI18n?.completedTitleTemplate ??
      base.completedTitleTemplate,
    completedDescription:
      stepI18n?.completedDescription ??
      metaI18n?.completedDescription ??
      base.completedDescription,
  };
}

function resolveTheme(metaTheme?: GuideTheme, stepTheme?: GuideTheme): GuideTheme {
  return {
    ...(metaTheme ?? {}),
    ...(stepTheme ?? {}),
  };
}

function resolvePills(metaPills?: GuidePills, stepPills?: GuidePills): GuidePills {
  return {
    ...(metaPills ?? {}),
    ...(stepPills ?? {}),
  };
}

function resolveActions(metaActions?: GuideActions, stepActions?: GuideActions): GuideActions {
  return {
    ...(metaActions ?? {}),
    ...(stepActions ?? {}),
  };
}

function isUiToggleEnabled(value: boolean | undefined): boolean {
  return value ?? true;
}

function resolvePrimaryAction(
  preferred: GuidePrimaryAction | undefined,
  actions: TooltipActionButton[]
): GuidePrimaryAction | null {
  const enabledActions = actions.filter((action) => !action.disabled).map((action) => action.key);
  if (preferred && enabledActions.includes(preferred)) {
    return preferred;
  }
  if (enabledActions.includes("next")) {
    return "next";
  }
  return null;
}

function resolveTooltipTemplate(
  step: GuideStep | undefined,
  guide: GuideDefinition
): GuideTooltipTemplate {
  const candidate =
    step?.tooltipTemplate ??
    step?.theme?.tooltipTemplate ??
    guide.meta.tooltipTemplate ??
    guide.meta.theme?.tooltipTemplate ??
    DEFAULT_TOOLTIP_TEMPLATE;

  if (candidate === "default") {
    return DEFAULT_TOOLTIP_TEMPLATE;
  }

  if (
    candidate === "glass" ||
    candidate === "minimal" ||
    candidate === "contrast" ||
    candidate === "dashboard-orange" ||
    candidate === "clean-white" ||
    candidate === "commerce-dark" ||
    candidate === "terminal-pop" ||
    candidate === "outline-light"
  ) {
    return candidate;
  }
  return DEFAULT_TOOLTIP_TEMPLATE;
}

function resolveTooltipPlacement(
  step: GuideStep | undefined,
  guide: GuideDefinition
): GuideTooltipPlacement {
  const candidate = step?.tooltipPlacement ?? guide.meta.tooltipPlacement ?? "auto";
  if (
    candidate === "auto" ||
    candidate === "top" ||
    candidate === "right" ||
    candidate === "bottom" ||
    candidate === "left"
  ) {
    return candidate;
  }
  return "auto";
}

function resolveHighlightPadding(step: GuideStep | undefined, guide: GuideDefinition): number {
  const candidate = step?.highlightPadding ?? guide.meta.highlightPadding;
  if (typeof candidate !== "number" || !Number.isFinite(candidate) || candidate < 0) {
    return DEFAULT_HIGHLIGHT_PADDING_PX;
  }
  return candidate;
}

function resolveHighlightBorderRadius(step: GuideStep | undefined, guide: GuideDefinition): number {
  const candidate = step?.highlightBorderRadius ?? guide.meta.highlightBorderRadius;
  if (typeof candidate !== "number" || !Number.isFinite(candidate) || candidate < 0) {
    return DEFAULT_HIGHLIGHT_BORDER_RADIUS_PX;
  }
  return candidate;
}

function pickAutoPlacement(
  target: TargetRect,
  tooltipWidth: number,
  tooltipHeight: number
): Exclude<GuideTooltipPlacement, "auto"> {
  const viewport = getViewportSize();
  const available = {
    bottom: viewport.height - (target.top + target.height) - TOOLTIP_MARGIN_PX,
    top: target.top - TOOLTIP_MARGIN_PX,
    right: viewport.width - (target.left + target.width) - TOOLTIP_MARGIN_PX,
    left: target.left - TOOLTIP_MARGIN_PX,
  };

  if (available.bottom >= tooltipHeight + TOOLTIP_GAP_PX) return "bottom";
  if (available.top >= tooltipHeight + TOOLTIP_GAP_PX) return "top";
  if (available.right >= tooltipWidth + TOOLTIP_GAP_PX) return "right";
  if (available.left >= tooltipWidth + TOOLTIP_GAP_PX) return "left";

  const best = (Object.entries(available) as Array<[Exclude<GuideTooltipPlacement, "auto">, number]>)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  return best ?? "bottom";
}

function buildTooltipStyleVars(theme: GuideTheme): TooltipStyleVars {
  const vars: TooltipStyleVars = {};
  if (theme.fontFamily) vars["--msgt-font-family"] = theme.fontFamily;
  if (theme.tooltipBackgroundColor) vars["--msgt-tooltip-bg"] = theme.tooltipBackgroundColor;
  if (theme.tooltipTextColor) vars["--msgt-tooltip-text"] = theme.tooltipTextColor;
  if (theme.tooltipBorderColor) vars["--msgt-tooltip-border"] = theme.tooltipBorderColor;
  if (typeof theme.tooltipBorderRadius === "number") {
    vars["--msgt-tooltip-border-radius"] = `${theme.tooltipBorderRadius}px`;
  }
  if (theme.tooltipShadow) vars["--msgt-tooltip-shadow"] = theme.tooltipShadow;
  if (theme.titleColor) vars["--msgt-title-color"] = theme.titleColor;
  if (theme.descriptionColor) vars["--msgt-description-color"] = theme.descriptionColor;
  if (theme.hintColor) vars["--msgt-hint-color"] = theme.hintColor;
  if (theme.warningColor) vars["--msgt-warning-color"] = theme.warningColor;
  if (theme.stepPillBackgroundColor) vars["--msgt-pill-step-bg"] = theme.stepPillBackgroundColor;
  if (theme.stepPillTextColor) vars["--msgt-pill-step-text"] = theme.stepPillTextColor;
  if (theme.kindPillBackgroundColor) vars["--msgt-pill-kind-bg"] = theme.kindPillBackgroundColor;
  if (theme.kindPillTextColor) vars["--msgt-pill-kind-text"] = theme.kindPillTextColor;
  if (typeof theme.pillFontSize === "number") {
    vars["--msgt-pill-font-size"] = `${theme.pillFontSize}px`;
  }
  if (typeof theme.pillFontWeight === "number") {
    vars["--msgt-pill-font-weight"] = `${theme.pillFontWeight}`;
  }
  if (theme.pillLetterSpacing) vars["--msgt-pill-letter-spacing"] = theme.pillLetterSpacing;
  if (theme.pillTextTransform) vars["--msgt-pill-text-transform"] = theme.pillTextTransform;
  if (theme.primaryButtonBackgroundColor) {
    vars["--msgt-btn-primary-bg"] = theme.primaryButtonBackgroundColor;
  }
  if (theme.primaryButtonTextColor) vars["--msgt-btn-primary-text"] = theme.primaryButtonTextColor;
  if (theme.primaryButtonBorderColor) {
    vars["--msgt-btn-primary-border"] = theme.primaryButtonBorderColor;
  }
  if (theme.primaryButtonHoverBackgroundColor) {
    vars["--msgt-btn-primary-hover-bg"] = theme.primaryButtonHoverBackgroundColor;
  }
  if (theme.primaryButtonHoverBorderColor) {
    vars["--msgt-btn-primary-hover-border"] = theme.primaryButtonHoverBorderColor;
  }
  if (theme.ghostButtonBackgroundColor) vars["--msgt-btn-ghost-bg"] = theme.ghostButtonBackgroundColor;
  if (theme.ghostButtonTextColor) vars["--msgt-btn-ghost-text"] = theme.ghostButtonTextColor;
  if (theme.ghostButtonBorderColor) vars["--msgt-btn-ghost-border"] = theme.ghostButtonBorderColor;
  if (theme.timerTrackColor) vars["--msgt-timer-track-bg"] = theme.timerTrackColor;
  if (theme.timerFillColor) vars["--msgt-timer-fill-bg"] = theme.timerFillColor;
  return vars;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function snapToDevicePixelStart(value: number): number {
  if (typeof window === "undefined") return value;
  const dpr = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  return Math.floor(value * dpr) / dpr;
}

function snapToDevicePixelEnd(value: number): number {
  if (typeof window === "undefined") return value;
  const dpr = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  return Math.ceil(value * dpr) / dpr;
}

function expandHighlightRect(rect: TargetRect, padding: number): TargetRect {
  const left = snapToDevicePixelStart(Math.max(0, rect.left - padding));
  const top = snapToDevicePixelStart(Math.max(0, rect.top - padding));
  const right = snapToDevicePixelEnd(rect.left + rect.width + padding);
  const bottom = snapToDevicePixelEnd(rect.top + rect.height + padding);

  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function resolveAdvanceMode(step: GuideStep): ResolvedAdvanceMode {
  if (step.advanceOn && step.advanceOn !== "auto") {
    return step.advanceOn;
  }
  if (step.kind === "Input") {
    return "input-idle";
  }
  if (step.kind === "Filter") {
    return "change";
  }
  return "click";
}

function resolveStepRequirements(
  step: GuideStep,
  mode: ResolvedAdvanceMode
): StepRequirements {
  return {
    requireClick:
      typeof step.mustClickTarget === "boolean"
        ? step.mustClickTarget
        : mode === "click",
    requireInput:
      typeof step.mustEnterValue === "boolean"
        ? step.mustEnterValue
        : mode === "input-idle" || mode === "change",
  };
}

function isStepSkippable(step: GuideStep): boolean {
  if (typeof step.skippable === "boolean") return step.skippable;
  if (typeof step.allowSkip === "boolean") return step.allowSkip;
  return true;
}

function hasControlValue(
  node: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): boolean {
  if (node instanceof HTMLInputElement) {
    const type = node.type.toLowerCase();
    if (type === "checkbox" || type === "radio") {
      return node.checked;
    }
  }
  return String(node.value ?? "").trim().length > 0;
}

function targetHasInputValue(target: HTMLElement): boolean {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return hasControlValue(target);
  }

  const controls = target.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input,textarea,select"
  );
  for (let i = 0; i < controls.length; i += 1) {
    const control = controls[i];
    if (hasControlValue(control)) {
      return true;
    }
  }
  return false;
}

function getFocusableTarget(target: HTMLElement): HTMLElement | null {
  if (target.matches("input,textarea,select,button,[role='combobox']")) {
    return target;
  }
  return target.querySelector<HTMLElement>("input,textarea,select,button,[role='combobox']");
}

function resolveStepTargetNames(step: GuideStep): string[] {
  const unique = new Set<string>();
  const ordered: string[] = [];

  const add = (value: string | undefined) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed || unique.has(trimmed)) return;
    unique.add(trimmed);
    ordered.push(trimmed);
  };

  add(step.target);
  if (Array.isArray(step.targets)) {
    step.targets.forEach(add);
  }

  return ordered;
}

function queryTargetElement(target: string, ext?: SpotlightExtension): HTMLElement | null {
  // Let extension resolve first, fall back to core
  let selector: string | undefined;
  if (ext?.resolveTargetSelector) {
    selector = ext.resolveTargetSelector(target);
  }
  if (!selector) {
    selector = coreResolveTargetSelector(target);
  }
  if (!selector) return null;

  try {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (elements.length === 0) return null;
    return elements.find((element) => isElementVisible(element)) ?? elements[0] ?? null;
  } catch {
    return null;
  }
}

function resolveVisibleTargets(step: GuideStep, ext?: SpotlightExtension): HTMLElement[] {
  const targetNames = resolveStepTargetNames(step);
  const unique = new Set<HTMLElement>();
  const resolved: HTMLElement[] = [];

  targetNames.forEach((target) => {
    const element = queryTargetElement(target, ext);
    if (!element || !isElementVisible(element) || unique.has(element)) return;
    unique.add(element);
    resolved.push(element);
  });

  return resolved;
}

function targetListHasInputValue(targets: HTMLElement[]): boolean {
  return targets.some(targetHasInputValue);
}

export function SpotlightGuideOverlay({
  open,
  guide: rawGuide,
  onClose,
  zIndex = MIN_OVERLAY_Z_INDEX,
  className,
  instance: instanceProp,
  extension: extensionProp,
}: SpotlightGuideOverlayProps) {
  // Resolve extension: prop > instance prop > context > none
  const contextInstance = useSpotlightInstance();
  const instance = instanceProp ?? contextInstance;
  const ext: SpotlightExtension | undefined =
    extensionProp ?? instance?.extension;

  // Apply transformGuide
  const guide = useMemo(() => {
    let g = rawGuide;
    if (ext?.transformGuide) {
      g = ext.transformGuide(g);
    }
    return g;
  }, [rawGuide, ext]);

  // Merge instance-level theme/i18n defaults into guide
  // (instance defaults are lower priority than guide-level settings)
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRects, setTargetRects] = useState<TargetRect[]>([]);
  const [targetMissing, setTargetMissing] = useState(false);
  const [hint, setHint] = useState("");
  const [manualPos, setManualPos] = useState<Position | null>(null);
  const [dragOffset, setDragOffset] = useState<DragState | null>(null);
  const [autoAdvanceProgress, setAutoAdvanceProgress] = useState<number | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: DEFAULT_TOOLTIP_WIDTH, height: DEFAULT_TOOLTIP_HEIGHT });
  const [showConfetti, setShowConfetti] = useState(false);

  const activeTargetsRef = useRef<HTMLElement[]>([]);
  const lastFocusedStepRef = useRef<string>("");
  const lastAdvancedStepRef = useRef<string>("");
  const inputIdleTimerRef = useRef<number | null>(null);
  const clickedTargetRef = useRef(false);
  const lastStepPosRef = useRef<Position | null>(null);
  const overlayIdRef = useRef(
    `msgt-overlay-${Math.random().toString(36).slice(2, 10)}`
  );
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const clearActiveTargets = useCallback(() => {
    activeTargetsRef.current.forEach((target) => {
      target.classList.remove("msgt-guide-target-active");
    });
    activeTargetsRef.current = [];
  }, []);

  const steps = guide.steps;
  const rawStep = steps[stepIndex];
  // Apply transformStep from extension before any downstream usage
  const currentStep = useMemo(() => {
    if (!rawStep) return undefined;
    if (!ext?.transformStep) return rawStep;
    return ext.transformStep(rawStep, stepIndex, guide);
  }, [rawStep, stepIndex, guide, ext]);
  const finished = stepIndex >= steps.length;
  const primaryTargetRect = targetRects[0] ?? null;
  const tooltipWidth = guide.meta.tooltipWidth ?? DEFAULT_TOOLTIP_WIDTH;
  const overlayColor = guide.meta.overlayColor ?? DEFAULT_OVERLAY_COLOR;
  const highlightColor =
    currentStep?.highlightColor ?? guide.meta.highlightColor ?? DEFAULT_HIGHLIGHT_COLOR;
  const highlightStyle =
    currentStep?.highlightStyle ?? guide.meta.highlightStyle ?? DEFAULT_HIGHLIGHT_STYLE;
  const highlightAnimation =
    currentStep?.highlightAnimation ??
    guide.meta.highlightAnimation ??
    DEFAULT_HIGHLIGHT_ANIMATION;
  const mode = currentStep ? resolveAdvanceMode(currentStep) : "none";
  const showHighlight = currentStep
    ? currentStep.showHighlight ?? guide.meta.showHighlight ?? true
    : guide.meta.showHighlight ?? true;
  const draggable = currentStep
    ? currentStep.draggable ?? guide.meta.draggable ?? true
    : guide.meta.draggable ?? true;
  const resolvedTexts = useMemo(() => {
    // Priority: instance defaults < guide.meta < step < extension override
    let mergedI18n: GuideI18n = {
      ...(instance?.i18n ?? {}),
      ...(guide.meta.i18n ?? {}),
      ...(currentStep?.i18n ?? {}),
    };
    if (ext?.resolveI18n) {
      mergedI18n = ext.resolveI18n(mergedI18n, currentStep, guide);
    }
    return resolveGuideTexts(mergedI18n, undefined);
  }, [guide, currentStep, ext, instance]);
  const resolvedTheme = useMemo(() => {
    // Priority: instance defaults < guide.meta < step < extension override
    const instanceTheme = instance?.theme ?? {};
    const baseGuideTheme: GuideTheme = { ...instanceTheme, ...(guide.meta.theme ?? {}) };
    let theme = resolveTheme(baseGuideTheme, currentStep?.theme);
    if (ext?.resolveTheme) {
      theme = ext.resolveTheme(theme, currentStep, guide);
    }
    return theme;
  }, [guide, currentStep, ext, instance]);
  const resolvedPills = useMemo(
    () => resolvePills(guide.meta.pills, currentStep?.pills),
    [guide.meta.pills, currentStep?.pills]
  );
  const resolvedActions = useMemo(
    () => resolveActions(guide.meta.actions, currentStep?.actions),
    [guide.meta.actions, currentStep?.actions]
  );
  const tooltipTemplate = useMemo(() => {
    const resolved = resolveTooltipTemplate(currentStep, guide);
    // If guide/step didn't set a template and we got the library default,
    // check if the instance has a preferred template
    if (
      resolved === DEFAULT_TOOLTIP_TEMPLATE &&
      !currentStep?.tooltipTemplate &&
      !currentStep?.theme?.tooltipTemplate &&
      !guide.meta.tooltipTemplate &&
      !guide.meta.theme?.tooltipTemplate &&
      instance?.tooltipTemplate
    ) {
      return instance.tooltipTemplate;
    }
    return resolved;
  }, [currentStep, guide, instance]);
  const tooltipPlacement = useMemo(
    () => resolveTooltipPlacement(currentStep, guide),
    [currentStep, guide]
  );
  const tooltipThemeStyle = useMemo(
    () => buildTooltipStyleVars(resolvedTheme),
    [resolvedTheme]
  );
  const renderedTooltipWidth = Math.min(tooltipWidth, 540);

  const tooltipPos = useMemo(() => {
    // When finished, stay where the last step's tooltip was
    if (finished && lastStepPosRef.current) {
      return lastStepPosRef.current;
    }
    if (manualPos) return manualPos;
    if (!primaryTargetRect || typeof window === "undefined") {
      return { left: TOOLTIP_MARGIN_PX, top: TOOLTIP_MARGIN_PX };
    }

    const tipWidth = tooltipSize.width > 0 ? tooltipSize.width : renderedTooltipWidth;
    const tipHeight = tooltipSize.height > 0 ? tooltipSize.height : DEFAULT_TOOLTIP_HEIGHT;
    const viewport = getViewportSize();
    const resolvedPlacement =
      tooltipPlacement === "auto"
        ? pickAutoPlacement(primaryTargetRect, tipWidth, tipHeight)
        : tooltipPlacement;

    let x = primaryTargetRect.left;
    let y = primaryTargetRect.top + primaryTargetRect.height + TOOLTIP_GAP_PX;

    if (resolvedPlacement === "top") {
      x = primaryTargetRect.left + primaryTargetRect.width / 2 - tipWidth / 2;
      y = primaryTargetRect.top - tipHeight - TOOLTIP_GAP_PX;
    } else if (resolvedPlacement === "right") {
      x = primaryTargetRect.left + primaryTargetRect.width + TOOLTIP_GAP_PX;
      y = primaryTargetRect.top + primaryTargetRect.height / 2 - tipHeight / 2;
    } else if (resolvedPlacement === "left") {
      x = primaryTargetRect.left - tipWidth - TOOLTIP_GAP_PX;
      y = primaryTargetRect.top + primaryTargetRect.height / 2 - tipHeight / 2;
    } else {
      x = primaryTargetRect.left + primaryTargetRect.width / 2 - tipWidth / 2;
      y = primaryTargetRect.top + primaryTargetRect.height + TOOLTIP_GAP_PX;
    }

    x = clamp(x, TOOLTIP_MARGIN_PX, viewport.width - tipWidth - TOOLTIP_MARGIN_PX);
    y = clamp(y, TOOLTIP_MARGIN_PX, viewport.height - tipHeight - TOOLTIP_MARGIN_PX);
    return { left: x, top: y };
  }, [
    finished,
    manualPos,
    primaryTargetRect,
    renderedTooltipWidth,
    tooltipPlacement,
    tooltipSize.height,
    tooltipSize.width,
  ]);

  // Track close reason for lifecycle hooks
  const closeReasonRef = useRef<GuideCloseEvent["reason"]>("user");

  const handleClose = useCallback(
    (reason: GuideCloseEvent["reason"] = "user") => {
      closeReasonRef.current = reason;
      onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setTargetRects([]);
    setTargetMissing(false);
    setHint("");
    setManualPos(null);
    setDragOffset(null);
    setAutoAdvanceProgress(null);
    clickedTargetRef.current = false;
    lastStepPosRef.current = null;
    setShowConfetti(false);
    lastFocusedStepRef.current = "";
    lastAdvancedStepRef.current = "";
  }, [open, guide.meta.id]);

  // Extension lifecycle: onGuideStart
  useEffect(() => {
    if (!open || !ext?.onGuideStart) return;
    ext.onGuideStart({ guideId: guide.meta.id, guide });
  }, [open, guide.meta.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extension lifecycle: onStepChange
  useEffect(() => {
    if (!open || finished || !currentStep || !ext?.onStepChange) return;
    ext.onStepChange({
      guideId: guide.meta.id,
      guide,
      stepIndex,
      step: currentStep,
      totalSteps: steps.length,
    });
  }, [open, stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extension lifecycle: onGuideComplete
  useEffect(() => {
    if (!open || !finished || !ext?.onGuideComplete) return;
    ext.onGuideComplete({
      guideId: guide.meta.id,
      guide,
      completedSteps: steps.length,
      totalSteps: steps.length,
    });
  }, [open, finished]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extension lifecycle: onGuideClose (fires when open goes from true to false)
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      return;
    }
    if (wasOpenRef.current && ext?.onGuideClose) {
      ext.onGuideClose({
        guideId: guide.meta.id,
        guide,
        stepIndex,
        reason: closeReasonRef.current,
      });
    }
    wasOpenRef.current = false;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const measure = () => {
      const node = tooltipRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(rect.width));
      const nextHeight = Math.max(1, Math.round(rect.height));
      setTooltipSize((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) {
          return prev;
        }
        return { width: nextWidth, height: nextHeight };
      });
    };

    measure();
    const rafId = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && tooltipRef.current) {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(tooltipRef.current);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measure);
      resizeObserver?.disconnect();
    };
  }, [open, stepIndex, tooltipTemplate, renderedTooltipWidth]);

  useEffect(() => {
    if (typeof window === "undefined" || !open) return;

    const onOverlayOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>;
      const senderId = customEvent.detail?.id;
      if (!senderId || senderId === overlayIdRef.current) return;
      handleClose("external");
    };

    window.addEventListener(OVERLAY_OPEN_EVENT, onOverlayOpen as EventListener);
    return () => {
      window.removeEventListener(OVERLAY_OPEN_EVENT, onOverlayOpen as EventListener);
    };
  }, [open, handleClose]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent<{ id: string }>(OVERLAY_OPEN_EVENT, {
        detail: { id: overlayIdRef.current },
      })
    );
  }, [open]);

  useEffect(() => {
    clickedTargetRef.current = false;
    lastAdvancedStepRef.current = "";
    setAutoAdvanceProgress(null);
    // When transitioning to finished, keep the last tooltip position
    if (finished) {
      return;
    }
    setTargetRects([]);
    // Reset manual drag position on step change so tooltip follows the new target.
    setManualPos(null);
    setDragOffset(null);
  }, [currentStep?.id, open, finished]);

  useEffect(() => {
    if (!draggable) {
      setDragOffset(null);
    }
  }, [draggable]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose("escape");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, handleClose]);

  useEffect(() => {
    if (!open || !dragOffset) return;

    const onPointerMove = (event: PointerEvent) => {
      const viewport = getViewportSize();
      const deltaX = event.clientX - dragOffset.startX;
      const deltaY = event.clientY - dragOffset.startY;
      const nextLeft = clamp(
        dragOffset.startLeft + deltaX,
        TOOLTIP_MARGIN_PX,
        viewport.width - renderedTooltipWidth - TOOLTIP_MARGIN_PX
      );
      const tooltipHeight = tooltipSize.height > 0 ? tooltipSize.height : DEFAULT_TOOLTIP_HEIGHT;
      const nextTop = clamp(
        dragOffset.startTop + deltaY,
        TOOLTIP_MARGIN_PX,
        viewport.height - tooltipHeight - TOOLTIP_MARGIN_PX
      );
      setManualPos({ left: nextLeft, top: nextTop });
    };

    const onPointerUp = () => setDragOffset(null);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragOffset, open, renderedTooltipWidth, tooltipSize.height]);

  useEffect(() => {
    if (!open || finished || !currentStep) return;

    let rafId: number | null = null;

    const scheduleSync = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        sync();
      });
    };

    const sync = () => {
      const targets = resolveVisibleTargets(currentStep, ext);
      if (targets.length === 0) {
        clearActiveTargets();
        setTargetRects([]);
        setTargetMissing(true);
        return;
      }

      const nextSet = new Set(targets);
      const activeSet = new Set(activeTargetsRef.current);
      activeTargetsRef.current.forEach((target) => {
        if (!nextSet.has(target)) {
          target.classList.remove("msgt-guide-target-active");
        }
      });
      targets.forEach((target) => {
        if (!activeSet.has(target)) {
          target.classList.add("msgt-guide-target-active");
        }
      });
      activeTargetsRef.current = targets;

      setTargetMissing(false);
      setTargetRects(targets.map(getRectForElement));

      if (lastFocusedStepRef.current !== currentStep.id) {
        const primaryTarget = targets[0];
        primaryTarget.scrollIntoView({ behavior: "auto", block: "center" });
        if (mode === "input-idle" || mode === "change") {
          const focusable = getFocusableTarget(primaryTarget);
          focusable?.focus({ preventScroll: true });
        }
        lastFocusedStepRef.current = currentStep.id;
      }
    };

    sync();
    const intervalId = window.setInterval(scheduleSync, 80);
    window.addEventListener("resize", scheduleSync);
    window.addEventListener("scroll", scheduleSync, true);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("scroll", scheduleSync, true);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      clearActiveTargets();
    };
  }, [clearActiveTargets, currentStep, ext, finished, mode, open]);

  const attemptAdvance = useCallback(() => {
    if (!open || finished || !currentStep) return;
    if (lastAdvancedStepRef.current === currentStep.id) return;

    const targets = resolveVisibleTargets(currentStep, ext);
    const requirements = resolveStepRequirements(currentStep, mode);

    if (requirements.requireClick && !clickedTargetRef.current) {
      setHint(resolvedTexts.requireClickMessage);
      return;
    }

    if (requirements.requireInput) {
      if (targets.length === 0 || !targetListHasInputValue(targets)) {
        setHint(resolvedTexts.requireInputMessage);
        return;
      }
    }

    lastAdvancedStepRef.current = currentStep.id;
    setHint("");
    setAutoAdvanceProgress(null);
    setStepIndex((prev) => Math.min(prev + 1, steps.length));
  }, [currentStep, ext, finished, mode, open, resolvedTexts.requireClickMessage, resolvedTexts.requireInputMessage, steps.length]);

  useEffect(() => {
    if (!open || finished || !currentStep) return;

    const requirements = resolveStepRequirements(currentStep, mode);
    const shouldShowTimerLoading = currentStep.showAutoAdvanceProgress ?? true;
    const autoAdvanceMs =
      typeof currentStep.autoAdvanceMs === "number" ? currentStep.autoAdvanceMs : 0;
    const getTargets = () => resolveVisibleTargets(currentStep, ext);

    const onClickCapture = (event: MouseEvent) => {
      const targets = getTargets();
      if (targets.length === 0) return;

      const node = event.target as Node | null;
      if (node && targets.some((target) => target.contains(node))) {
        clickedTargetRef.current = true;
        if (mode === "click") {
          attemptAdvance();
        }
        return;
      }

      if (mode === "click") {
        setHint(resolvedTexts.clickHighlightedMessage);
      }
    };

    const onChangeCapture = (event: Event) => {
      if (mode !== "change" && mode !== "input-idle") return;
      const targets = getTargets();
      if (targets.length === 0) return;

      const node = event.target as HTMLElement | null;
      if (!node || !targets.some((target) => target.contains(node))) return;

      if (mode === "change") {
        if (targetListHasInputValue(targets) || !requirements.requireInput) {
          attemptAdvance();
        }
        return;
      }

      if (mode === "input-idle" && node instanceof HTMLSelectElement) {
        if (targetListHasInputValue(targets) || !requirements.requireInput) {
          attemptAdvance();
        }
      }
    };

    const onInputCapture = (event: Event) => {
      if (mode !== "input-idle") return;
      const targets = getTargets();
      if (targets.length === 0) return;

      const node = event.target as HTMLElement | null;
      if (!node || !targets.some((target) => target.contains(node))) return;
      if (!(node instanceof HTMLInputElement) && !(node instanceof HTMLTextAreaElement)) {
        return;
      }

      if (inputIdleTimerRef.current) {
        window.clearTimeout(inputIdleTimerRef.current);
      }

      const idleMs = currentStep.inputIdleMs ?? DEFAULT_INPUT_IDLE_MS;
      inputIdleTimerRef.current = window.setTimeout(() => {
        const latestTargets = getTargets();
        if (latestTargets.length === 0) {
          inputIdleTimerRef.current = null;
          return;
        }

        if (targetListHasInputValue(latestTargets) || !requirements.requireInput) {
          attemptAdvance();
        }
        inputIdleTimerRef.current = null;
      }, idleMs);
    };

    let autoAdvanceTimeoutId: number | null = null;
    let autoAdvanceProgressIntervalId: number | null = null;
    if (autoAdvanceMs > 0) {
      const startedAt = Date.now();
      if (shouldShowTimerLoading) {
        setAutoAdvanceProgress(0);
        autoAdvanceProgressIntervalId = window.setInterval(() => {
          const elapsedMs = Date.now() - startedAt;
          setAutoAdvanceProgress(clamp(elapsedMs / autoAdvanceMs, 0, 1));
        }, 80);
      } else {
        setAutoAdvanceProgress(null);
      }

      autoAdvanceTimeoutId = window.setTimeout(() => {
        if (shouldShowTimerLoading) {
          setAutoAdvanceProgress(1);
        }
        attemptAdvance();
      }, autoAdvanceMs);
    } else {
      setAutoAdvanceProgress(null);
    }

    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("change", onChangeCapture, true);
    document.addEventListener("input", onInputCapture, true);

    return () => {
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("change", onChangeCapture, true);
      document.removeEventListener("input", onInputCapture, true);
      if (inputIdleTimerRef.current) {
        window.clearTimeout(inputIdleTimerRef.current);
        inputIdleTimerRef.current = null;
      }
      if (autoAdvanceTimeoutId) {
        window.clearTimeout(autoAdvanceTimeoutId);
      }
      if (autoAdvanceProgressIntervalId) {
        window.clearInterval(autoAdvanceProgressIntervalId);
      }
    };
  }, [attemptAdvance, currentStep, finished, mode, open, resolvedTexts.clickHighlightedMessage]);

  // Track the tooltip position on every non-finished render so we have it
  // available synchronously when the guide finishes.
  useEffect(() => {
    if (!finished && primaryTargetRect) {
      lastStepPosRef.current = { left: tooltipPos.left, top: tooltipPos.top };
    }
  });

  useEffect(() => {
    if (finished) {
      clearActiveTargets();
      if (guide.meta.finishAnimation) {
        setShowConfetti(true);
      }
    } else {
      setShowConfetti(false);
    }
  }, [clearActiveTargets, finished]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) {
    return null;
  }

  const canSkip = Boolean(currentStep && isStepSkippable(currentStep));
  const showStepProgressPill = Boolean(currentStep && isUiToggleEnabled(resolvedPills.showStepProgress));
  const showKindPill = Boolean(currentStep && isUiToggleEnabled(resolvedPills.showKind));
  const showCloseButton = Boolean(currentStep && isUiToggleEnabled(resolvedActions.showClose));
  const showBackButton = Boolean(currentStep && isUiToggleEnabled(resolvedActions.showBack));
  const showNextButton = Boolean(currentStep && isUiToggleEnabled(resolvedActions.showNext));
  const showSkipButton = Boolean(
    currentStep && canSkip && isUiToggleEnabled(resolvedActions.showSkip)
  );
  const actionButtons: TooltipActionButton[] = [];
  if (showBackButton) {
    actionButtons.push({
      key: "back",
      label: resolvedTexts.backButtonLabel,
      disabled: stepIndex === 0,
      onClick: () => {
        setHint("");
        setStepIndex((prev) => Math.max(0, prev - 1));
      },
    });
  }
  if (showSkipButton) {
    actionButtons.push({
      key: "skip",
      label: resolvedTexts.skipButtonLabel,
      onClick: () => {
        setHint("");
        setStepIndex((prev) => Math.min(prev + 1, steps.length));
      },
    });
  }
  if (showNextButton) {
    actionButtons.push({
      key: "next",
      label: resolvedTexts.nextButtonLabel,
      onClick: attemptAdvance,
    });
  }
  const primaryAction = resolvePrimaryAction(resolvedActions.primaryAction, actionButtons);
  const orderedActionButtons =
    primaryAction === null
      ? actionButtons
      : [
          ...actionButtons.filter((action) => action.key !== primaryAction),
          ...actionButtons.filter((action) => action.key === primaryAction),
        ];
  const hasActionButtons = actionButtons.length > 0;
  const hasVisiblePills = showStepProgressPill || showKindPill;
  const showTooltipTop = Boolean(currentStep && (hasVisiblePills || showCloseButton || draggable));
  const autoAdvanceEnabled = Boolean(
    currentStep &&
      typeof currentStep.autoAdvanceMs === "number" &&
      currentStep.autoAdvanceMs > 0
  );
  const showAutoAdvanceProgress = Boolean(
    currentStep && autoAdvanceEnabled && (currentStep.showAutoAdvanceProgress ?? true)
  );
  const autoAdvanceProgressValue = clamp(autoAdvanceProgress ?? 0, 0, 1);
  const autoAdvanceProgressPercent = Math.round(autoAdvanceProgressValue * 100);
  const autoAdvanceRemainingMs =
    currentStep && autoAdvanceEnabled
      ? Math.max(
          0,
          Math.ceil((1 - autoAdvanceProgressValue) * (currentStep.autoAdvanceMs ?? 0))
        )
      : 0;
  const useDashedStroke =
    highlightStyle === "dash" ||
    highlightAnimation === "dash" ||
    highlightAnimation === "color-dash";
  const animateDash =
    highlightAnimation === "dash" || highlightAnimation === "color-dash";
  const animateColor =
    highlightAnimation === "color" || highlightAnimation === "color-dash";
  const highlightPadding = resolveHighlightPadding(currentStep, guide);
  const highlightBorderRadius = resolveHighlightBorderRadius(currentStep, guide);
  const highlightRects = targetRects.map((rect) => expandHighlightRect(rect, highlightPadding));
  const highlightStrokeInset = HIGHLIGHT_STROKE_WIDTH_PX / 2;
  const highlightStrokeRadius = Math.max(0, highlightBorderRadius - highlightStrokeInset);
  const highlightStrokeClassName = [
    "msgt-highlight-stroke-rect",
    useDashedStroke ? "msgt-highlight-stroke-rect--dash" : "",
    animateDash ? "msgt-highlight-stroke-rect--anim-dash" : "",
    animateColor ? "msgt-highlight-stroke-rect--anim-color" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const stepProgressText =
    currentStep
      ? interpolate(resolvedTexts.stepProgressLabel, {
          current: stepIndex + 1,
          total: steps.length,
        })
      : "";
  const targetMissingMessage =
    currentStep
      ? interpolate(resolvedTexts.targetMissingMessage, {
          target: resolveStepTargetNames(currentStep).join(", "),
        })
      : "";
  const autoAdvanceMessage = interpolate(resolvedTexts.autoAdvanceMessage, {
    seconds: (autoAdvanceRemainingMs / 1000).toFixed(1),
  });
  const completedTitle =
    guide.meta.tooltipTitle ??
    interpolate(resolvedTexts.completedTitleTemplate, { title: guide.meta.title });
  const { width: viewportWidth, height: viewportHeight } = getViewportSize();
  const highlightMaskId = `${overlayIdRef.current}-highlight-mask`;
  const overlayZIndex = Math.max(zIndex, MIN_OVERLAY_Z_INDEX);

  // Build render override context for extensions
  const tooltipRenderContext = currentStep
    ? {
        guide,
        step: currentStep,
        stepIndex,
        totalSteps: steps.length,
        tooltipTemplate,
        goNext: attemptAdvance,
        goBack: () => {
          setHint("");
          setStepIndex((prev) => Math.max(0, prev - 1));
        },
        skip: () => {
          setHint("");
          setStepIndex((prev) => Math.min(prev + 1, steps.length));
        },
        close: () => handleClose("user"),
      }
    : null;

  const completedRenderContext = finished
    ? {
        guide,
        completedSteps: steps.length,
        totalSteps: steps.length,
        close: () => handleClose("finish"),
      }
    : null;

  // Check for render overrides from extension
  const customTooltipBody =
    ext?.renderTooltipBody && tooltipRenderContext
      ? ext.renderTooltipBody(tooltipRenderContext)
      : undefined;
  const customTooltipSupplement =
    ext?.renderTooltipSupplement && tooltipRenderContext
      ? ext.renderTooltipSupplement(tooltipRenderContext)
      : undefined;
  const customCompletedScreen =
    ext?.renderCompletedScreen && completedRenderContext
      ? ext.renderCompletedScreen(completedRenderContext)
      : undefined;

  const overlayNode = (
    <div className={`msgt-overlay-root ${className ?? ""}`.trim()} style={{ zIndex: overlayZIndex }}>
      {!finished && showHighlight && highlightRects.length > 0 && viewportWidth > 0 && viewportHeight > 0 ? (
        <svg
          className="msgt-overlay-backdrop-svg"
          width={viewportWidth}
          height={viewportHeight}
          viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <mask
              id={highlightMaskId}
              x={0}
              y={0}
              width={viewportWidth}
              height={viewportHeight}
              maskUnits="userSpaceOnUse"
              maskContentUnits="userSpaceOnUse"
            >
              <rect x={0} y={0} width={viewportWidth} height={viewportHeight} fill="#ffffff" />
              {highlightRects.map((rect, index) => (
                <rect
                  key={`mask-${index}`}
                  x={rect.left}
                  y={rect.top}
                  width={rect.width}
                  height={rect.height}
                  rx={highlightBorderRadius}
                  ry={highlightBorderRadius}
                  fill="#000000"
                />
              ))}
            </mask>
          </defs>
          <rect
            x={0}
            y={0}
            width={viewportWidth}
            height={viewportHeight}
            fill={overlayColor}
            mask={`url(#${highlightMaskId})`}
          />
        </svg>
      ) : (
        <div className="msgt-overlay-backdrop" style={{ backgroundColor: overlayColor }} />
      )}

      {!finished && showHighlight && highlightRects.length > 0 && (
        <>
          {highlightRects.map((rect, index) => {
            const highlightStrokeRectWidth = Math.max(0, rect.width - HIGHLIGHT_STROKE_WIDTH_PX);
            const highlightStrokeRectHeight = Math.max(0, rect.height - HIGHLIGHT_STROKE_WIDTH_PX);

            return (
              <svg
                key={`stroke-${index}`}
                className="msgt-highlight-stroke"
                style={{
                  left: `${rect.left}px`,
                  top: `${rect.top}px`,
                  width: `${rect.width}px`,
                  height: `${rect.height}px`,
                }}
                viewBox={`0 0 ${rect.width} ${rect.height}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <rect
                  className={highlightStrokeClassName}
                  x={highlightStrokeInset}
                  y={highlightStrokeInset}
                  width={highlightStrokeRectWidth}
                  height={highlightStrokeRectHeight}
                  rx={highlightStrokeRadius}
                  ry={highlightStrokeRadius}
                  style={{ color: highlightColor, stroke: highlightColor }}
                />
              </svg>
            );
          })}
        </>
      )}

      <div
        ref={tooltipRef}
        className={`msgt-tooltip msgt-tooltip--${tooltipTemplate}`}
        style={{
          width: renderedTooltipWidth,
          left: tooltipPos.left,
          top: tooltipPos.top,
          ...tooltipThemeStyle,
        }}
        >
          {!finished && currentStep ? (
            customTooltipBody ?? (
            <>
              {showTooltipTop && (
                <div
                  className={`msgt-tooltip-top${
                    hasVisiblePills ? "" : " msgt-tooltip-top--minimal msgt-tooltip-top--floating"
                  }`}
                  style={{ cursor: draggable ? (dragOffset ? "grabbing" : "grab") : "default" }}
                  onPointerDown={(event) => {
                    if (!draggable) return;
                    event.preventDefault();
                    setDragOffset({
                      startX: event.clientX,
                      startY: event.clientY,
                      startLeft: tooltipPos.left,
                      startTop: tooltipPos.top,
                    });
                  }}
                >
                  <div className="msgt-tooltip-top-left">
                    {showStepProgressPill && (
                      <span className="msgt-pill msgt-pill-step">{stepProgressText}</span>
                    )}
                    {showKindPill && (
                      <span className="msgt-pill msgt-pill-kind">{currentStep.kind}</span>
                    )}
                  </div>
                  {showCloseButton && (
                    <button
                      type="button"
                      className="msgt-tooltip-dismiss"
                      aria-label={resolvedTexts.closeButtonLabel}
                      title={resolvedTexts.closeButtonLabel}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => handleClose("user")}
                    >
                      x
                    </button>
                  )}
                </div>
              )}

              <h3 className="msgt-title">{currentStep.title}</h3>
              <p className="msgt-description">{currentStep.description}</p>
              {customTooltipSupplement}

              {targetMissing ? (
                <p className="msgt-hint msgt-hint-warning">{targetMissingMessage}</p>
              ) : (
                <p className="msgt-hint">
                  {showHighlight
                    ? resolvedTexts.followHighlightMessage
                    : resolvedTexts.followTargetMessage}
                </p>
              )}

              {hint && <p className="msgt-hint msgt-hint-warning">{hint}</p>}
              {showAutoAdvanceProgress && (
                <div className="msgt-timer-root">
                  <p className="msgt-hint">{autoAdvanceMessage}</p>
                  <div
                    className="msgt-timer-track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={autoAdvanceProgressPercent}
                  >
                    <span
                      className="msgt-timer-fill"
                      style={{ width: `${autoAdvanceProgressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {hasActionButtons && (
                <div className="msgt-tooltip-actions">
                  {orderedActionButtons.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      className={`msgt-btn ${
                        primaryAction === action.key ? "msgt-btn-primary" : "msgt-btn-ghost"
                      }`}
                      disabled={action.disabled}
                      onClick={action.onClick}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </>
            )
          ) : (
            customCompletedScreen ?? (
            <>
              <h3 className="msgt-title">{completedTitle}</h3>
              <p className="msgt-description">{resolvedTexts.completedDescription}</p>
              <div className="msgt-tooltip-actions">
                <button type="button" className="msgt-btn msgt-btn-primary" onClick={() => handleClose("finish")}>
                  {resolvedTexts.finishButtonLabel}
                </button>
              </div>
            </>
            )
          )}
        </div>
        {showConfetti && (
          <div className="msgt-confetti-container" style={{ left: tooltipPos.left, top: tooltipPos.top }}>
            {Array.from({ length: 30 }, (_, i) => (
              <span key={i} className="msgt-confetti-particle" style={{ '--ci': i } as React.CSSProperties} />
            ))}
          </div>
        )}
    </div>
  );

  // Apply wrapOverlay from extension
  const wrappedOverlayNode = ext?.wrapOverlay
    ? ext.wrapOverlay(overlayNode, guide)
    : overlayNode;

  if (typeof document === "undefined") {
    return wrappedOverlayNode as React.JSX.Element;
  }

  return createPortal(wrappedOverlayNode, document.body);
}
