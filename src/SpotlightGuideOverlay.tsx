import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type {
  GuideDefinition,
  GuideHighlightAnimation,
  GuideHighlightStyle,
  GuideI18n,
  GuideStep,
  GuideTheme,
  GuideTooltipPlacement,
  GuideTooltipTemplate,
} from "./types";
import { getRectForElement, isElementVisible, resolveTargetSelector, type TargetRect } from "./dom";

export interface SpotlightGuideOverlayProps {
  open: boolean;
  guide: GuideDefinition;
  onClose: () => void;
  zIndex?: number;
  className?: string;
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
const HIGHLIGHT_OUTER_OFFSET_PX = 1;
const HIGHLIGHT_STROKE_WIDTH_PX = 4;
const HIGHLIGHT_RADIUS_PX = 10;
const TOOLTIP_MARGIN_PX = 16;
const TOOLTIP_GAP_PX = 12;
const OVERLAY_OPEN_EVENT = "msgt:overlay-open";
type ResolvedAdvanceMode = "click" | "change" | "input-idle" | "none";

interface StepRequirements {
  requireClick: boolean;
  requireInput: boolean;
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

function pickAutoPlacement(
  target: TargetRect,
  tooltipWidth: number,
  tooltipHeight: number
): Exclude<GuideTooltipPlacement, "auto"> {
  const available = {
    bottom: window.innerHeight - (target.top + target.height) - TOOLTIP_MARGIN_PX,
    top: target.top - TOOLTIP_MARGIN_PX,
    right: window.innerWidth - (target.left + target.width) - TOOLTIP_MARGIN_PX,
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

export function SpotlightGuideOverlay({
  open,
  guide,
  onClose,
  zIndex = 3000,
  className,
}: SpotlightGuideOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [hint, setHint] = useState("");
  const [manualPos, setManualPos] = useState<Position | null>(null);
  const [dragOffset, setDragOffset] = useState<DragState | null>(null);
  const [autoAdvanceProgress, setAutoAdvanceProgress] = useState<number | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: DEFAULT_TOOLTIP_WIDTH, height: DEFAULT_TOOLTIP_HEIGHT });

  const activeTargetRef = useRef<HTMLElement | null>(null);
  const lastFocusedStepRef = useRef<string>("");
  const lastAdvancedStepRef = useRef<string>("");
  const inputIdleTimerRef = useRef<number | null>(null);
  const clickedTargetRef = useRef(false);
  const overlayIdRef = useRef(
    `msgt-overlay-${Math.random().toString(36).slice(2, 10)}`
  );
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const steps = guide.steps;
  const currentStep = steps[stepIndex];
  const finished = stepIndex >= steps.length;
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
  const resolvedTexts = useMemo(
    () => resolveGuideTexts(guide.meta.i18n, currentStep?.i18n),
    [guide.meta.i18n, currentStep?.i18n]
  );
  const resolvedTheme = useMemo(
    () => resolveTheme(guide.meta.theme, currentStep?.theme),
    [guide.meta.theme, currentStep?.theme]
  );
  const tooltipTemplate = useMemo(
    () => resolveTooltipTemplate(currentStep, guide),
    [currentStep, guide]
  );
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
    if (manualPos) return manualPos;
    if (!targetRect || typeof window === "undefined") {
      return { left: TOOLTIP_MARGIN_PX, top: TOOLTIP_MARGIN_PX };
    }

    const tipWidth = tooltipSize.width > 0 ? tooltipSize.width : renderedTooltipWidth;
    const tipHeight = tooltipSize.height > 0 ? tooltipSize.height : DEFAULT_TOOLTIP_HEIGHT;
    const resolvedPlacement =
      tooltipPlacement === "auto"
        ? pickAutoPlacement(targetRect, tipWidth, tipHeight)
        : tooltipPlacement;

    let x = targetRect.left;
    let y = targetRect.top + targetRect.height + TOOLTIP_GAP_PX;

    if (resolvedPlacement === "top") {
      x = targetRect.left + targetRect.width / 2 - tipWidth / 2;
      y = targetRect.top - tipHeight - TOOLTIP_GAP_PX;
    } else if (resolvedPlacement === "right") {
      x = targetRect.left + targetRect.width + TOOLTIP_GAP_PX;
      y = targetRect.top + targetRect.height / 2 - tipHeight / 2;
    } else if (resolvedPlacement === "left") {
      x = targetRect.left - tipWidth - TOOLTIP_GAP_PX;
      y = targetRect.top + targetRect.height / 2 - tipHeight / 2;
    } else {
      x = targetRect.left + targetRect.width / 2 - tipWidth / 2;
      y = targetRect.top + targetRect.height + TOOLTIP_GAP_PX;
    }

    x = clamp(x, TOOLTIP_MARGIN_PX, window.innerWidth - tipWidth - TOOLTIP_MARGIN_PX);
    y = clamp(y, TOOLTIP_MARGIN_PX, window.innerHeight - tipHeight - TOOLTIP_MARGIN_PX);
    return { left: x, top: y };
  }, [manualPos, renderedTooltipWidth, targetRect, tooltipPlacement, tooltipSize.height, tooltipSize.width]);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setTargetRect(null);
    setTargetMissing(false);
    setHint("");
    setManualPos(null);
    setDragOffset(null);
    setAutoAdvanceProgress(null);
    clickedTargetRef.current = false;
    lastFocusedStepRef.current = "";
    lastAdvancedStepRef.current = "";
  }, [open, guide.meta.id]);

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
      onClose();
    };

    window.addEventListener(OVERLAY_OPEN_EVENT, onOverlayOpen as EventListener);
    return () => {
      window.removeEventListener(OVERLAY_OPEN_EVENT, onOverlayOpen as EventListener);
    };
  }, [open, onClose]);

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
    // Reset manual drag position on step change so tooltip follows the new target.
    setManualPos(null);
    setDragOffset(null);
  }, [currentStep?.id, open]);

  useEffect(() => {
    if (!draggable) {
      setDragOffset(null);
    }
  }, [draggable]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !dragOffset) return;

    const onPointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - dragOffset.startX;
      const deltaY = event.clientY - dragOffset.startY;
      const nextLeft = clamp(
        dragOffset.startLeft + deltaX,
        TOOLTIP_MARGIN_PX,
        window.innerWidth - renderedTooltipWidth - TOOLTIP_MARGIN_PX
      );
      const tooltipHeight = tooltipSize.height > 0 ? tooltipSize.height : DEFAULT_TOOLTIP_HEIGHT;
      const nextTop = clamp(
        dragOffset.startTop + deltaY,
        TOOLTIP_MARGIN_PX,
        window.innerHeight - tooltipHeight - TOOLTIP_MARGIN_PX
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

    const selector = resolveTargetSelector(currentStep.target);
    let rafId: number | null = null;

    const scheduleSync = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        sync();
      });
    };

    const sync = () => {
      const target = selector ? document.querySelector<HTMLElement>(selector) : null;
      if (!target || !isElementVisible(target)) {
        if (activeTargetRef.current) {
          activeTargetRef.current.classList.remove("msgt-guide-target-active");
          activeTargetRef.current = null;
        }
        setTargetRect(null);
        setTargetMissing(true);
        return;
      }

      if (activeTargetRef.current && activeTargetRef.current !== target) {
        activeTargetRef.current.classList.remove("msgt-guide-target-active");
      }
      target.classList.add("msgt-guide-target-active");
      activeTargetRef.current = target;

      setTargetMissing(false);
      setTargetRect(getRectForElement(target));

      if (lastFocusedStepRef.current !== currentStep.id) {
        target.scrollIntoView({ behavior: "auto", block: "center" });
        if (mode === "input-idle" || mode === "change") {
          const focusable = getFocusableTarget(target);
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
      if (activeTargetRef.current) {
        activeTargetRef.current.classList.remove("msgt-guide-target-active");
      }
    };
  }, [currentStep, finished, open]);

  const attemptAdvance = useCallback(() => {
    if (!open || finished || !currentStep) return;
    if (lastAdvancedStepRef.current === currentStep.id) return;

    const selector = resolveTargetSelector(currentStep.target);
    const target = selector ? document.querySelector<HTMLElement>(selector) : null;
    const requirements = resolveStepRequirements(currentStep, mode);

    if (requirements.requireClick && !clickedTargetRef.current) {
      setHint(resolvedTexts.requireClickMessage);
      return;
    }

    if (requirements.requireInput) {
      if (!target || !targetHasInputValue(target)) {
        setHint(resolvedTexts.requireInputMessage);
        return;
      }
    }

    lastAdvancedStepRef.current = currentStep.id;
    setHint("");
    setAutoAdvanceProgress(null);
    setStepIndex((prev) => Math.min(prev + 1, steps.length));
  }, [currentStep, finished, mode, open, resolvedTexts.requireClickMessage, resolvedTexts.requireInputMessage, steps.length]);

  useEffect(() => {
    if (!open || finished || !currentStep) return;

    const selector = resolveTargetSelector(currentStep.target);
    const requirements = resolveStepRequirements(currentStep, mode);
    const shouldShowTimerLoading = currentStep.showAutoAdvanceProgress ?? true;
    const autoAdvanceMs =
      typeof currentStep.autoAdvanceMs === "number" ? currentStep.autoAdvanceMs : 0;
    const getTarget = () => (selector ? document.querySelector<HTMLElement>(selector) : null);

    const onClickCapture = (event: MouseEvent) => {
      const target = getTarget();
      if (!target) return;

      const node = event.target as Node | null;
      if (node && target.contains(node)) {
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
      const target = getTarget();
      if (!target) return;

      const node = event.target as HTMLElement | null;
      if (!node || !target.contains(node)) return;

      if (mode === "change") {
        if (targetHasInputValue(target) || !requirements.requireInput) {
          attemptAdvance();
        }
        return;
      }

      if (mode === "input-idle" && node instanceof HTMLSelectElement) {
        if (targetHasInputValue(target) || !requirements.requireInput) {
          attemptAdvance();
        }
      }
    };

    const onInputCapture = (event: Event) => {
      if (mode !== "input-idle") return;
      const target = getTarget();
      if (!target) return;

      const node = event.target as HTMLElement | null;
      if (!node || !target.contains(node)) return;
      if (!(node instanceof HTMLInputElement) && !(node instanceof HTMLTextAreaElement)) {
        return;
      }

      if (inputIdleTimerRef.current) {
        window.clearTimeout(inputIdleTimerRef.current);
      }

      const idleMs = currentStep.inputIdleMs ?? DEFAULT_INPUT_IDLE_MS;
      inputIdleTimerRef.current = window.setTimeout(() => {
        const latestTarget = getTarget();
        if (!latestTarget) {
          inputIdleTimerRef.current = null;
          return;
        }

        if (targetHasInputValue(latestTarget) || !requirements.requireInput) {
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

  useEffect(() => {
    if (finished && activeTargetRef.current) {
      activeTargetRef.current.classList.remove("msgt-guide-target-active");
      activeTargetRef.current = null;
    }
  }, [finished]);

  if (!open) {
    return null;
  }

  const canSkip = Boolean(currentStep && isStepSkippable(currentStep));
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
  const highlightLeft = targetRect
    ? Math.max(0, targetRect.left - HIGHLIGHT_OUTER_OFFSET_PX)
    : 0;
  const highlightTop = targetRect
    ? Math.max(0, targetRect.top - HIGHLIGHT_OUTER_OFFSET_PX)
    : 0;
  const highlightWidth = targetRect
    ? targetRect.width + HIGHLIGHT_OUTER_OFFSET_PX * 2
    : 0;
  const highlightHeight = targetRect
    ? targetRect.height + HIGHLIGHT_OUTER_OFFSET_PX * 2
    : 0;
  const highlightStrokeInset = HIGHLIGHT_STROKE_WIDTH_PX / 2;
  const highlightStrokeRectWidth = Math.max(0, highlightWidth - HIGHLIGHT_STROKE_WIDTH_PX);
  const highlightStrokeRectHeight = Math.max(0, highlightHeight - HIGHLIGHT_STROKE_WIDTH_PX);
  const highlightStrokeRadius = Math.max(0, HIGHLIGHT_RADIUS_PX - highlightStrokeInset);
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
          target: currentStep.target,
        })
      : "";
  const autoAdvanceMessage = interpolate(resolvedTexts.autoAdvanceMessage, {
    seconds: (autoAdvanceRemainingMs / 1000).toFixed(1),
  });
  const completedTitle =
    guide.meta.tooltipTitle ??
    interpolate(resolvedTexts.completedTitleTemplate, { title: guide.meta.title });

  const overlayNode = (
    <div className={`msgt-overlay-root ${className ?? ""}`.trim()} style={{ zIndex }}>
      <div className="msgt-overlay-backdrop" style={{ backgroundColor: overlayColor }} />

      {!finished && targetRect && showHighlight && (
        <>
          <div
            className="msgt-highlight"
            style={{
              left: `${highlightLeft}px`,
              top: `${highlightTop}px`,
              width: `${highlightWidth}px`,
              height: `${highlightHeight}px`,
              boxShadow: `0 0 0 9999px ${overlayColor}`,
            }}
          />
          <svg
            className="msgt-highlight-stroke"
            style={{
              left: `${highlightLeft}px`,
              top: `${highlightTop}px`,
              width: `${highlightWidth}px`,
              height: `${highlightHeight}px`,
            }}
            viewBox={`0 0 ${highlightWidth} ${highlightHeight}`}
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
          <>
            <div
              className="msgt-tooltip-top"
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
              <span className="msgt-pill msgt-pill-step">{stepProgressText}</span>
              <span className="msgt-pill msgt-pill-kind">{currentStep.kind}</span>
            </div>

            <h3 className="msgt-title">{currentStep.title}</h3>
            <p className="msgt-description">{currentStep.description}</p>

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

            <div className="msgt-tooltip-actions">
              <button type="button" className="msgt-btn msgt-btn-ghost" onClick={onClose}>
                {resolvedTexts.closeButtonLabel}
              </button>

              <div className="msgt-tooltip-right-actions">
                {mode === "none" && (
                  <button
                    type="button"
                    className="msgt-btn msgt-btn-primary"
                    onClick={attemptAdvance}
                  >
                    {resolvedTexts.nextButtonLabel}
                  </button>
                )}

                <button
                  type="button"
                  className="msgt-btn msgt-btn-ghost"
                  disabled={stepIndex === 0}
                  onClick={() => {
                    setHint("");
                    setStepIndex((prev) => Math.max(0, prev - 1));
                  }}
                >
                  {resolvedTexts.backButtonLabel}
                </button>

                {canSkip && (
                  <button
                    type="button"
                    className="msgt-btn msgt-btn-primary"
                    onClick={() => setStepIndex((prev) => Math.min(prev + 1, steps.length))}
                  >
                    {resolvedTexts.skipButtonLabel}
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 className="msgt-title">{completedTitle}</h3>
            <p className="msgt-description">{resolvedTexts.completedDescription}</p>
            <div className="msgt-tooltip-actions">
              <button type="button" className="msgt-btn msgt-btn-primary" onClick={onClose}>
                {resolvedTexts.finishButtonLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return overlayNode;
  }

  return createPortal(overlayNode, document.body);
}
