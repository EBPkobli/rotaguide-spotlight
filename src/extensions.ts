import type { ReactNode } from "react";
import type {
  GuideDefinition,
  GuideStep,
  GuideTheme,
  GuideI18n,
  GuideTooltipTemplate,
} from "./types";

// ---------------------------------------------------------------------------
// Lifecycle event payloads
// ---------------------------------------------------------------------------

export interface GuideLifecycleEvent {
  guideId: string;
  guide: GuideDefinition;
}

export interface StepLifecycleEvent extends GuideLifecycleEvent {
  stepIndex: number;
  step: GuideStep;
  totalSteps: number;
}

export interface GuideCompleteEvent extends GuideLifecycleEvent {
  completedSteps: number;
  totalSteps: number;
}

export interface GuideCloseEvent extends GuideLifecycleEvent {
  stepIndex: number;
  reason: "user" | "escape" | "finish" | "external";
}

// ---------------------------------------------------------------------------
// Extension hooks — all optional
// ---------------------------------------------------------------------------

export interface SpotlightExtension {
  /** Unique name for debugging and deduplication. */
  name: string;

  // --- Lifecycle hooks ---

  /** Called before a guide opens. Return `false` to prevent it. */
  canStartGuide?(event: GuideLifecycleEvent): boolean | Promise<boolean>;

  /** Called when the guide overlay opens. */
  onGuideStart?(event: GuideLifecycleEvent): void;

  /** Called when a step becomes active. */
  onStepChange?(event: StepLifecycleEvent): void;

  /** Called when the guide reaches the finished screen. */
  onGuideComplete?(event: GuideCompleteEvent): void;

  /** Called when the guide closes for any reason. */
  onGuideClose?(event: GuideCloseEvent): void;

  // --- Transformation hooks ---

  /** Transform or replace the guide definition before rendering. */
  transformGuide?(guide: GuideDefinition): GuideDefinition;

  /** Transform a step before it is rendered. */
  transformStep?(step: GuideStep, index: number, guide: GuideDefinition): GuideStep;

  // --- Theme & i18n hooks ---

  /** Merge or replace the resolved theme for the current step. */
  resolveTheme?(theme: GuideTheme, step: GuideStep | undefined, guide: GuideDefinition): GuideTheme;

  /** Merge or replace the resolved i18n texts. */
  resolveI18n?(i18n: GuideI18n, step: GuideStep | undefined, guide: GuideDefinition): GuideI18n;

  // --- Target resolution ---

  /** Resolve a target name to a CSS selector. Return `undefined` to fall through. */
  resolveTargetSelector?(target: string): string | undefined;

  // --- Render overrides ---

  /** Override tooltip body rendering. Return `undefined` to use default. */
  renderTooltipBody?(context: TooltipRenderContext): ReactNode | undefined;

  /** Inject supplemental content into the default tooltip body. */
  renderTooltipSupplement?(context: TooltipRenderContext): ReactNode | undefined;

  /** Override the completed screen rendering. Return `undefined` to use default. */
  renderCompletedScreen?(context: CompletedRenderContext): ReactNode | undefined;

  /** Wrap the entire overlay in additional providers or elements. */
  wrapOverlay?(overlay: ReactNode, guide: GuideDefinition): ReactNode;
}

// ---------------------------------------------------------------------------
// Render context shapes passed to render overrides
// ---------------------------------------------------------------------------

export interface TooltipRenderContext {
  guide: GuideDefinition;
  step: GuideStep;
  stepIndex: number;
  totalSteps: number;
  tooltipTemplate: GuideTooltipTemplate;
  goNext: () => void;
  goBack: () => void;
  skip: () => void;
  close: () => void;
}

export interface CompletedRenderContext {
  guide: GuideDefinition;
  completedSteps: number;
  totalSteps: number;
  close: () => void;
}

// ---------------------------------------------------------------------------
// Extension composition
// ---------------------------------------------------------------------------

/**
 * Define a named extension. This is a typed identity function for better DX.
 *
 * @example
 * ```ts
 * const analytics = defineExtension({
 *   name: "analytics",
 *   onGuideStart({ guideId }) { track("guide_started", { guideId }); },
 *   onGuideComplete({ guideId }) { track("guide_completed", { guideId }); },
 * });
 * ```
 */
export function defineExtension(ext: SpotlightExtension): SpotlightExtension {
  return ext;
}

/**
 * Compose multiple extensions into a single merged extension.
 * Hooks are called in order. Transform hooks are piped (output of one feeds input of next).
 * Lifecycle hooks are all invoked. Render overrides use the first non-undefined result.
 */
export function composeExtensions(...extensions: SpotlightExtension[]): SpotlightExtension {
  const names = extensions.map((e) => e.name).join("+");

  return {
    name: names,

    async canStartGuide(event) {
      for (const ext of extensions) {
        if (ext.canStartGuide) {
          const result = await ext.canStartGuide(event);
          if (result === false) return false;
        }
      }
      return true;
    },

    onGuideStart(event) {
      for (const ext of extensions) {
        ext.onGuideStart?.(event);
      }
    },

    onStepChange(event) {
      for (const ext of extensions) {
        ext.onStepChange?.(event);
      }
    },

    onGuideComplete(event) {
      for (const ext of extensions) {
        ext.onGuideComplete?.(event);
      }
    },

    onGuideClose(event) {
      for (const ext of extensions) {
        ext.onGuideClose?.(event);
      }
    },

    transformGuide(guide) {
      let result = guide;
      for (const ext of extensions) {
        if (ext.transformGuide) {
          result = ext.transformGuide(result);
        }
      }
      return result;
    },

    transformStep(step, index, guide) {
      let result = step;
      for (const ext of extensions) {
        if (ext.transformStep) {
          result = ext.transformStep(result, index, guide);
        }
      }
      return result;
    },

    resolveTheme(theme, step, guide) {
      let result = theme;
      for (const ext of extensions) {
        if (ext.resolveTheme) {
          result = ext.resolveTheme(result, step, guide);
        }
      }
      return result;
    },

    resolveI18n(i18n, step, guide) {
      let result = i18n;
      for (const ext of extensions) {
        if (ext.resolveI18n) {
          result = ext.resolveI18n(result, step, guide);
        }
      }
      return result;
    },

    resolveTargetSelector(target) {
      for (const ext of extensions) {
        if (ext.resolveTargetSelector) {
          const result = ext.resolveTargetSelector(target);
          if (result !== undefined) return result;
        }
      }
      return undefined;
    },

    renderTooltipBody(context) {
      for (const ext of extensions) {
        if (ext.renderTooltipBody) {
          const result = ext.renderTooltipBody(context);
          if (result !== undefined) return result;
        }
      }
      return undefined;
    },

    renderTooltipSupplement(context) {
      for (const ext of extensions) {
        if (ext.renderTooltipSupplement) {
          const result = ext.renderTooltipSupplement(context);
          if (result !== undefined) return result;
        }
      }
      return undefined;
    },

    renderCompletedScreen(context) {
      for (const ext of extensions) {
        if (ext.renderCompletedScreen) {
          const result = ext.renderCompletedScreen(context);
          if (result !== undefined) return result;
        }
      }
      return undefined;
    },

    wrapOverlay(overlay, guide) {
      let result = overlay;
      for (const ext of extensions) {
        if (ext.wrapOverlay) {
          result = ext.wrapOverlay(result, guide);
        }
      }
      return result;
    },
  };
}
