import {
  GUIDE_ADVANCE_MODES,
  GUIDE_HIGHLIGHT_ANIMATIONS,
  GUIDE_HIGHLIGHT_STYLES,
  GUIDE_KINDS,
  GUIDE_PRIMARY_ACTIONS,
  GUIDE_TEXT_TRANSFORMS,
  GUIDE_TOOLTIP_PLACEMENTS,
  GUIDE_TOOLTIP_TEMPLATES,
  type GuideDefinition,
  type GuideIssue,
  type GuideStep,
} from "./types";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeTargets(target: string, targets?: string[]): string[] {
  const unique = new Set<string>();
  const ordered: string[] = [];

  if (hasText(target)) {
    const trimmed = target.trim();
    unique.add(trimmed);
    ordered.push(trimmed);
  }

  if (Array.isArray(targets)) {
    targets.forEach((entry) => {
      if (!hasText(entry)) return;
      const trimmed = entry.trim();
      if (unique.has(trimmed)) return;
      unique.add(trimmed);
      ordered.push(trimmed);
    });
  }

  return ordered;
}

function normalizeStep(step: GuideStep): GuideStep {
  const normalizedTargets = normalizeTargets(step.target, step.targets);

  return {
    ...step,
    id: step.id.trim(),
    target: normalizedTargets[0] ?? "",
    targets: normalizedTargets.length > 0 ? normalizedTargets : undefined,
    title: step.title.trim(),
    description: step.description.trim(),
    tooltipPlacement: step.tooltipPlacement,
    allowSkip: step.allowSkip,
    skippable: step.skippable,
    advanceOn: step.advanceOn,
    inputIdleMs: step.inputIdleMs,
    showHighlight: step.showHighlight,
    highlightColor: step.highlightColor,
    draggable: step.draggable,
    highlightStyle: step.highlightStyle,
    highlightAnimation: step.highlightAnimation,
    tooltipTemplate: step.tooltipTemplate,
    autoAdvanceMs: step.autoAdvanceMs,
    showAutoAdvanceProgress: step.showAutoAdvanceProgress,
    mustClickTarget: step.mustClickTarget,
    mustEnterValue: step.mustEnterValue,
    i18n: step.i18n,
    pills: step.pills,
    actions: step.actions,
    theme: step.theme,
  };
}

export function validateGuideDefinition(
  guide: GuideDefinition,
  stepLineMap: Map<string, number> = new Map()
): GuideIssue[] {
  const issues: GuideIssue[] = [];

  if (!hasText(guide.meta.title)) {
    issues.push({
      code: "GUIDE_META_MISSING_TITLE",
      message: "Guide meta.title is required.",
      hint: "Set meta.title in markdown frontmatter or in json/yaml guide data.",
    });
  }

  if (
    typeof guide.meta.highlightStyle === "string" &&
    !GUIDE_HIGHLIGHT_STYLES.includes(guide.meta.highlightStyle)
  ) {
    issues.push({
      code: "GUIDE_META_INVALID_FIELD",
      message: `Guide meta.highlightStyle is invalid: ${guide.meta.highlightStyle}.`,
      hint: `Allowed: ${GUIDE_HIGHLIGHT_STYLES.join(", ")}`,
    });
  }

  if (
    typeof guide.meta.highlightAnimation === "string" &&
    !GUIDE_HIGHLIGHT_ANIMATIONS.includes(guide.meta.highlightAnimation)
  ) {
    issues.push({
      code: "GUIDE_META_INVALID_FIELD",
      message: `Guide meta.highlightAnimation is invalid: ${guide.meta.highlightAnimation}.`,
      hint: `Allowed: ${GUIDE_HIGHLIGHT_ANIMATIONS.join(", ")}`,
    });
  }

  if (
    typeof guide.meta.tooltipPlacement === "string" &&
    !GUIDE_TOOLTIP_PLACEMENTS.includes(guide.meta.tooltipPlacement)
  ) {
    issues.push({
      code: "GUIDE_META_INVALID_FIELD",
      message: `Guide meta.tooltipPlacement is invalid: ${guide.meta.tooltipPlacement}.`,
      hint: `Allowed: ${GUIDE_TOOLTIP_PLACEMENTS.join(", ")}`,
    });
  }

  if (
    typeof guide.meta.tooltipTemplate === "string" &&
    !GUIDE_TOOLTIP_TEMPLATES.includes(guide.meta.tooltipTemplate)
  ) {
    issues.push({
      code: "GUIDE_META_INVALID_FIELD",
      message: `Guide meta.tooltipTemplate is invalid: ${guide.meta.tooltipTemplate}.`,
      hint: `Allowed: ${GUIDE_TOOLTIP_TEMPLATES.join(", ")}`,
    });
  }

  if (
    typeof guide.meta.theme?.tooltipTemplate === "string" &&
    !GUIDE_TOOLTIP_TEMPLATES.includes(guide.meta.theme.tooltipTemplate)
  ) {
    issues.push({
      code: "GUIDE_META_INVALID_FIELD",
      message: `Guide meta.theme.tooltipTemplate is invalid: ${guide.meta.theme.tooltipTemplate}.`,
      hint: `Allowed: ${GUIDE_TOOLTIP_TEMPLATES.join(", ")}`,
    });
  }

  if (
    typeof guide.meta.theme?.tooltipBorderRadius === "number" &&
    (!Number.isFinite(guide.meta.theme.tooltipBorderRadius) ||
      guide.meta.theme.tooltipBorderRadius < 0)
  ) {
    issues.push({
      code: "GUIDE_META_INVALID_FIELD",
      message: "Guide meta.theme.tooltipBorderRadius is invalid.",
      hint: "Use a non-negative number (px).",
    });
  }

  if (
    typeof guide.meta.theme?.pillFontSize === "number" &&
    (!Number.isFinite(guide.meta.theme.pillFontSize) || guide.meta.theme.pillFontSize < 0)
  ) {
    issues.push({
      code: "GUIDE_META_INVALID_FIELD",
      message: "Guide meta.theme.pillFontSize is invalid.",
      hint: "Use a non-negative number (px).",
    });
  }

  if (
    typeof guide.meta.theme?.pillFontWeight === "number" &&
    (!Number.isFinite(guide.meta.theme.pillFontWeight) || guide.meta.theme.pillFontWeight <= 0)
  ) {
    issues.push({
      code: "GUIDE_META_INVALID_FIELD",
      message: "Guide meta.theme.pillFontWeight is invalid.",
      hint: "Use a positive number.",
    });
  }

  if (
    typeof guide.meta.theme?.pillTextTransform === "string" &&
    !GUIDE_TEXT_TRANSFORMS.includes(guide.meta.theme.pillTextTransform)
  ) {
    issues.push({
      code: "GUIDE_META_INVALID_FIELD",
      message: `Guide meta.theme.pillTextTransform is invalid: ${guide.meta.theme.pillTextTransform}.`,
      hint: `Allowed: ${GUIDE_TEXT_TRANSFORMS.join(", ")}`,
    });
  }

  if (
    typeof guide.meta.actions?.primaryAction === "string" &&
    !GUIDE_PRIMARY_ACTIONS.includes(guide.meta.actions.primaryAction)
  ) {
    issues.push({
      code: "GUIDE_META_INVALID_FIELD",
      message: `Guide meta.actions.primaryAction is invalid: ${guide.meta.actions.primaryAction}.`,
      hint: `Allowed: ${GUIDE_PRIMARY_ACTIONS.join(", ")}`,
    });
  }

  if (!Array.isArray(guide.steps) || guide.steps.length === 0) {
    issues.push({
      code: "GUIDE_STEP_EMPTY",
      message: "At least one step is required.",
      hint: "Add at least one step in guide.steps or markdown step sections.",
    });
    return issues;
  }

  const seen = new Set<string>();

  guide.steps.forEach((rawStep) => {
    const step = normalizeStep(rawStep);
    const line = stepLineMap.get(step.id);

    if (!hasText(step.id)) {
      issues.push({
        code: "GUIDE_STEP_MISSING_FIELD",
        line,
        message: "Step id is required.",
        hint: "Set id in the block or provide one in heading.",
      });
      return;
    }

    if (seen.has(step.id)) {
      issues.push({
        code: "GUIDE_STEP_DUPLICATE_ID",
        line,
        message: `Duplicate step id: ${step.id}`,
        hint: "Use unique ids for every step.",
      });
    }
    seen.add(step.id);

    if (!Array.isArray(step.targets) || step.targets.length === 0) {
      issues.push({
        code: "GUIDE_STEP_MISSING_FIELD",
        line,
        message: `Step ${step.id} is missing target selector.`,
        hint: "Set target: [data-click-guide=\"my-target\"] or targets: [\"id-1\", \"id-2\"]",
      });
    }

    if (!hasText(step.title)) {
      issues.push({
        code: "GUIDE_STEP_MISSING_FIELD",
        line,
        message: `Step ${step.id} is missing title.`,
      });
    }

    if (!hasText(step.description)) {
      issues.push({
        code: "GUIDE_STEP_MISSING_FIELD",
        line,
        message: `Step ${step.id} is missing description.`,
      });
    }

    if (!GUIDE_KINDS.includes(step.kind)) {
      issues.push({
        code: "GUIDE_STEP_INVALID_KIND",
        line,
        message: `Step ${step.id} has invalid kind: ${String(step.kind)}.`,
        hint: `Allowed: ${GUIDE_KINDS.join(", ")}`,
      });
    }

    if (
      typeof step.advanceOn === "string" &&
      !GUIDE_ADVANCE_MODES.includes(step.advanceOn)
    ) {
      issues.push({
        code: "GUIDE_STEP_INVALID_ADVANCE",
        line,
        message: `Step ${step.id} has invalid advanceOn value: ${step.advanceOn}.`,
        hint: `Allowed: ${GUIDE_ADVANCE_MODES.join(", ")}`,
      });
    }

    if (
      typeof step.inputIdleMs !== "undefined" &&
      (!Number.isFinite(step.inputIdleMs) || step.inputIdleMs < 0)
    ) {
      issues.push({
        code: "GUIDE_STEP_INVALID_ADVANCE",
        line,
        message: `Step ${step.id} has invalid inputIdleMs.`,
        hint: "Use a positive number in milliseconds.",
      });
    }

    if (
      typeof step.autoAdvanceMs !== "undefined" &&
      (!Number.isFinite(step.autoAdvanceMs) || step.autoAdvanceMs < 0)
    ) {
      issues.push({
        code: "GUIDE_STEP_INVALID_FIELD",
        line,
        message: `Step ${step.id} has invalid autoAdvanceMs.`,
        hint: "Use a positive number in milliseconds.",
      });
    }

    if (
      typeof step.highlightStyle === "string" &&
      !GUIDE_HIGHLIGHT_STYLES.includes(step.highlightStyle)
    ) {
      issues.push({
        code: "GUIDE_STEP_INVALID_FIELD",
        line,
        message: `Step ${step.id} has invalid highlightStyle: ${step.highlightStyle}.`,
        hint: `Allowed: ${GUIDE_HIGHLIGHT_STYLES.join(", ")}`,
      });
    }

    if (
      typeof step.highlightAnimation === "string" &&
      !GUIDE_HIGHLIGHT_ANIMATIONS.includes(step.highlightAnimation)
    ) {
      issues.push({
        code: "GUIDE_STEP_INVALID_FIELD",
        line,
        message: `Step ${step.id} has invalid highlightAnimation: ${step.highlightAnimation}.`,
        hint: `Allowed: ${GUIDE_HIGHLIGHT_ANIMATIONS.join(", ")}`,
      });
    }

    if (
      typeof step.tooltipPlacement === "string" &&
      !GUIDE_TOOLTIP_PLACEMENTS.includes(step.tooltipPlacement)
    ) {
      issues.push({
        code: "GUIDE_STEP_INVALID_FIELD",
        line,
        message: `Step ${step.id} has invalid tooltipPlacement: ${step.tooltipPlacement}.`,
        hint: `Allowed: ${GUIDE_TOOLTIP_PLACEMENTS.join(", ")}`,
      });
    }

    if (
      typeof step.tooltipTemplate === "string" &&
      !GUIDE_TOOLTIP_TEMPLATES.includes(step.tooltipTemplate)
    ) {
      issues.push({
        code: "GUIDE_STEP_INVALID_FIELD",
        line,
        message: `Step ${step.id} has invalid tooltipTemplate: ${step.tooltipTemplate}.`,
        hint: `Allowed: ${GUIDE_TOOLTIP_TEMPLATES.join(", ")}`,
      });
    }

    if (
      typeof step.theme?.tooltipTemplate === "string" &&
      !GUIDE_TOOLTIP_TEMPLATES.includes(step.theme.tooltipTemplate)
    ) {
      issues.push({
        code: "GUIDE_STEP_INVALID_FIELD",
        line,
        message: `Step ${step.id} has invalid theme.tooltipTemplate: ${step.theme.tooltipTemplate}.`,
        hint: `Allowed: ${GUIDE_TOOLTIP_TEMPLATES.join(", ")}`,
      });
    }

    if (
      typeof step.theme?.tooltipBorderRadius === "number" &&
      (!Number.isFinite(step.theme.tooltipBorderRadius) ||
        step.theme.tooltipBorderRadius < 0)
    ) {
      issues.push({
        code: "GUIDE_STEP_INVALID_FIELD",
        line,
        message: `Step ${step.id} has invalid theme.tooltipBorderRadius.`,
        hint: "Use a non-negative number (px).",
      });
    }

    if (
      typeof step.theme?.pillFontSize === "number" &&
      (!Number.isFinite(step.theme.pillFontSize) || step.theme.pillFontSize < 0)
    ) {
      issues.push({
        code: "GUIDE_STEP_INVALID_FIELD",
        line,
        message: `Step ${step.id} has invalid theme.pillFontSize.`,
        hint: "Use a non-negative number (px).",
      });
    }

    if (
      typeof step.theme?.pillFontWeight === "number" &&
      (!Number.isFinite(step.theme.pillFontWeight) || step.theme.pillFontWeight <= 0)
    ) {
      issues.push({
        code: "GUIDE_STEP_INVALID_FIELD",
        line,
        message: `Step ${step.id} has invalid theme.pillFontWeight.`,
        hint: "Use a positive number.",
      });
    }

    if (
      typeof step.theme?.pillTextTransform === "string" &&
      !GUIDE_TEXT_TRANSFORMS.includes(step.theme.pillTextTransform)
    ) {
      issues.push({
        code: "GUIDE_STEP_INVALID_FIELD",
        line,
        message: `Step ${step.id} has invalid theme.pillTextTransform: ${step.theme.pillTextTransform}.`,
        hint: `Allowed: ${GUIDE_TEXT_TRANSFORMS.join(", ")}`,
      });
    }

    if (
      typeof step.actions?.primaryAction === "string" &&
      !GUIDE_PRIMARY_ACTIONS.includes(step.actions.primaryAction)
    ) {
      issues.push({
        code: "GUIDE_STEP_INVALID_FIELD",
        line,
        message: `Step ${step.id} has invalid actions.primaryAction: ${step.actions.primaryAction}.`,
        hint: `Allowed: ${GUIDE_PRIMARY_ACTIONS.join(", ")}`,
      });
    }

  });

  return issues;
}
