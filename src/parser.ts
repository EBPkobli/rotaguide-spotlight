import { load as loadYaml } from "js-yaml";
import { GuideParseError } from "./errors";
import type {
  GuideAdvanceMode,
  GuideDefinition,
  GuideHighlightAnimation,
  GuideHighlightStyle,
  GuideI18n,
  GuideIssue,
  GuideKind,
  GuideMeta,
  GuideSourceFormat,
  GuideStep,
  GuideTheme,
  GuideTooltipPlacement,
  GuideTooltipTemplate,
} from "./types";
import { validateGuideDefinition } from "./validate";

interface ParseState {
  lines: string[];
  bodyStartLine: number;
  frontmatter: Partial<GuideMeta>;
}

interface ParseGuideOptions {
  format?: GuideSourceFormat;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseFrontmatter(markdown: string, issues: GuideIssue[]): ParseState {
  const lines = markdown.split(/\r?\n/);

  if (lines.length === 0 || !markdown.trim()) {
    issues.push({
      code: "MD_EMPTY",
      message: "Guide content is empty.",
      line: 1,
    });
    return { lines: [], bodyStartLine: 1, frontmatter: {} };
  }

  if (lines[0].trim() !== "---") {
    return { lines, bodyStartLine: 1, frontmatter: {} };
  }

  let closingIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex < 0) {
    issues.push({
      code: "MD_FRONTMATTER_INVALID",
      message: "Frontmatter starts with --- but closing --- was not found.",
      line: 1,
    });
    return { lines, bodyStartLine: 1, frontmatter: {} };
  }

  const raw = lines.slice(1, closingIndex).join("\n");
  try {
    const parsed = loadYaml(raw);
    if (parsed && typeof parsed === "object") {
      return {
        lines: lines.slice(closingIndex + 1),
        bodyStartLine: closingIndex + 2,
        frontmatter: parsed as Partial<GuideMeta>,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown YAML parse error";
    issues.push({
      code: "MD_FRONTMATTER_INVALID",
      line: 1,
      message: `Frontmatter YAML is invalid: ${message}`,
    });
  }

  return {
    lines: lines.slice(closingIndex + 1),
    bodyStartLine: closingIndex + 2,
    frontmatter: {},
  };
}

function parseConfigBlock(
  block: string,
  lang: "yaml" | "json",
  line: number,
  issues: GuideIssue[]
): Record<string, unknown> | null {
  if (lang === "json") {
    try {
      const parsed = JSON.parse(block);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        issues.push({
          code: "MD_STEP_BLOCK_INVALID",
          line,
          message: "Step JSON block must be an object.",
        });
        return null;
      }
      return parsed as Record<string, unknown>;
    } catch (error) {
      issues.push({
        code: "MD_STEP_JSON_INVALID",
        line,
        message: `Step JSON block is invalid: ${
          error instanceof Error ? error.message : "Unknown parse error"
        }`,
      });
      return null;
    }
  }

  try {
    const parsed = loadYaml(block);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      issues.push({
        code: "MD_STEP_BLOCK_INVALID",
        line,
        message: "Step YAML block must be an object.",
      });
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    issues.push({
      code: "MD_STEP_BLOCK_INVALID",
      line,
      message: `Step YAML block is invalid: ${
        error instanceof Error ? error.message : "Unknown parse error"
      }`,
    });
    return null;
  }
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toOptionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseHighlightStyle(value: unknown): GuideHighlightStyle | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "line" || normalized === "solid") return "line";
  if (normalized === "dash" || normalized === "dashed") return "dash";
  return normalized as GuideHighlightStyle;
}

function parseHighlightAnimation(value: unknown): GuideHighlightAnimation | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "none" || normalized === "off") return "none";
  if (normalized === "color") return "color";
  if (normalized === "dash" || normalized === "dash-move" || normalized === "dashmove") {
    return "dash";
  }
  if (
    normalized === "color-dash" ||
    normalized === "dash-color" ||
    normalized === "color-dash-move"
  ) {
    return "color-dash";
  }
  return normalized as GuideHighlightAnimation;
}

function parseTooltipPlacement(value: unknown): GuideTooltipPlacement | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "up" || normalized === "above") return "top";
  if (normalized === "down" || normalized === "below") return "bottom";
  if (normalized === "start") return "left";
  if (normalized === "end") return "right";
  return normalized as GuideTooltipPlacement;
}

function parseTooltipTemplate(value: unknown): GuideTooltipTemplate | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "classic" || normalized === "base" || normalized === "standard") {
    return "default";
  }
  if (normalized === "dark") return "contrast";
  if (normalized === "dashboard" || normalized === "dark-dashboard") {
    return "dashboard-orange";
  }
  if (normalized === "clean" || normalized === "light") {
    return "clean-white";
  }
  if (normalized === "ecommerce" || normalized === "promo-dark") {
    return "commerce-dark";
  }
  if (normalized === "terminal" || normalized === "code-tour") {
    return "terminal-pop";
  }
  if (normalized === "outlined" || normalized === "outline") {
    return "outline-light";
  }
  return normalized as GuideTooltipTemplate;
}

function parseI18n(raw: Record<string, unknown>): GuideI18n | undefined {
  const locale =
    toOptionalTrimmedString(raw.locale) ??
    toOptionalTrimmedString(raw.lang) ??
    toOptionalTrimmedString(raw.language);
  const i18n: GuideI18n = {
    locale,
    stepProgressLabel: toOptionalTrimmedString(raw.stepProgressLabel),
    backButtonLabel: toOptionalTrimmedString(raw.backButtonLabel),
    nextButtonLabel: toOptionalTrimmedString(raw.nextButtonLabel),
    closeButtonLabel: toOptionalTrimmedString(raw.closeButtonLabel),
    skipButtonLabel: toOptionalTrimmedString(raw.skipButtonLabel),
    finishButtonLabel: toOptionalTrimmedString(raw.finishButtonLabel),
    targetMissingMessage: toOptionalTrimmedString(raw.targetMissingMessage),
    followHighlightMessage: toOptionalTrimmedString(raw.followHighlightMessage),
    followTargetMessage: toOptionalTrimmedString(raw.followTargetMessage),
    requireClickMessage: toOptionalTrimmedString(raw.requireClickMessage),
    requireInputMessage: toOptionalTrimmedString(raw.requireInputMessage),
    clickHighlightedMessage: toOptionalTrimmedString(raw.clickHighlightedMessage),
    autoAdvanceMessage: toOptionalTrimmedString(raw.autoAdvanceMessage),
    completedTitleTemplate: toOptionalTrimmedString(raw.completedTitleTemplate),
    completedDescription: toOptionalTrimmedString(raw.completedDescription),
  };

  if (Object.values(i18n).every((value) => typeof value === "undefined")) {
    return undefined;
  }
  return i18n;
}

function parseTheme(raw: Record<string, unknown>): GuideTheme | undefined {
  const theme: GuideTheme = {
    tooltipTemplate: parseTooltipTemplate(
      raw.tooltipTemplate ?? raw.tooltipVariant ?? raw.template
    ),
    fontFamily: toOptionalTrimmedString(raw.fontFamily),
    tooltipBackgroundColor: toOptionalTrimmedString(raw.tooltipBackgroundColor),
    tooltipTextColor: toOptionalTrimmedString(raw.tooltipTextColor),
    tooltipBorderColor: toOptionalTrimmedString(raw.tooltipBorderColor),
    tooltipBorderRadius: toOptionalNumber(raw.tooltipBorderRadius),
    tooltipShadow: toOptionalTrimmedString(raw.tooltipShadow),
    titleColor: toOptionalTrimmedString(raw.titleColor),
    descriptionColor: toOptionalTrimmedString(raw.descriptionColor),
    hintColor: toOptionalTrimmedString(raw.hintColor),
    warningColor: toOptionalTrimmedString(raw.warningColor),
    stepPillBackgroundColor: toOptionalTrimmedString(raw.stepPillBackgroundColor),
    stepPillTextColor: toOptionalTrimmedString(raw.stepPillTextColor),
    kindPillBackgroundColor: toOptionalTrimmedString(raw.kindPillBackgroundColor),
    kindPillTextColor: toOptionalTrimmedString(raw.kindPillTextColor),
    primaryButtonBackgroundColor: toOptionalTrimmedString(raw.primaryButtonBackgroundColor),
    primaryButtonTextColor: toOptionalTrimmedString(raw.primaryButtonTextColor),
    primaryButtonBorderColor: toOptionalTrimmedString(raw.primaryButtonBorderColor),
    primaryButtonHoverBackgroundColor: toOptionalTrimmedString(raw.primaryButtonHoverBackgroundColor),
    primaryButtonHoverBorderColor: toOptionalTrimmedString(raw.primaryButtonHoverBorderColor),
    ghostButtonBackgroundColor: toOptionalTrimmedString(raw.ghostButtonBackgroundColor),
    ghostButtonTextColor: toOptionalTrimmedString(raw.ghostButtonTextColor),
    ghostButtonBorderColor: toOptionalTrimmedString(raw.ghostButtonBorderColor),
    timerTrackColor: toOptionalTrimmedString(raw.timerTrackColor),
    timerFillColor: toOptionalTrimmedString(raw.timerFillColor),
  };

  if (Object.values(theme).every((value) => typeof value === "undefined")) {
    return undefined;
  }
  return theme;
}

function parseMetaI18n(raw: Record<string, unknown>): GuideI18n | undefined {
  const nested =
    asRecord(raw.i18n) ??
    asRecord(raw.texts) ??
    asRecord(raw.labels) ??
    {};
  const merged: Record<string, unknown> = {
    ...nested,
    locale: nested.locale ?? raw.locale ?? raw.lang ?? raw.language,
    stepProgressLabel: nested.stepProgressLabel ?? raw.stepProgressLabel,
    backButtonLabel: nested.backButtonLabel ?? raw.backButtonLabel,
    nextButtonLabel: nested.nextButtonLabel ?? raw.nextButtonLabel,
    closeButtonLabel: nested.closeButtonLabel ?? raw.closeButtonLabel,
    skipButtonLabel: nested.skipButtonLabel ?? raw.skipButtonLabel,
    finishButtonLabel: nested.finishButtonLabel ?? raw.finishButtonLabel,
    targetMissingMessage: nested.targetMissingMessage ?? raw.targetMissingMessage,
    followHighlightMessage: nested.followHighlightMessage ?? raw.followHighlightMessage,
    followTargetMessage: nested.followTargetMessage ?? raw.followTargetMessage,
    requireClickMessage: nested.requireClickMessage ?? raw.requireClickMessage,
    requireInputMessage: nested.requireInputMessage ?? raw.requireInputMessage,
    clickHighlightedMessage: nested.clickHighlightedMessage ?? raw.clickHighlightedMessage,
    autoAdvanceMessage: nested.autoAdvanceMessage ?? raw.autoAdvanceMessage,
    completedTitleTemplate: nested.completedTitleTemplate ?? raw.completedTitleTemplate,
    completedDescription: nested.completedDescription ?? raw.completedDescription,
  };
  return parseI18n(merged);
}

function parseMetaTheme(raw: Record<string, unknown>): GuideTheme | undefined {
  const nested =
    asRecord(raw.theme) ??
    asRecord(raw.style) ??
    asRecord(raw.design) ??
    {};
  const merged: Record<string, unknown> = {
    ...nested,
    tooltipTemplate:
      nested.tooltipTemplate ??
      nested.tooltipVariant ??
      nested.template ??
      raw.tooltipTemplate ??
      raw.tooltipVariant ??
      raw.template,
    fontFamily: nested.fontFamily ?? raw.fontFamily,
    tooltipBackgroundColor: nested.tooltipBackgroundColor ?? raw.tooltipBackgroundColor,
    tooltipTextColor: nested.tooltipTextColor ?? raw.tooltipTextColor,
    tooltipBorderColor: nested.tooltipBorderColor ?? raw.tooltipBorderColor,
    tooltipBorderRadius: nested.tooltipBorderRadius ?? raw.tooltipBorderRadius,
    tooltipShadow: nested.tooltipShadow ?? raw.tooltipShadow,
    titleColor: nested.titleColor ?? raw.titleColor,
    descriptionColor: nested.descriptionColor ?? raw.descriptionColor,
    hintColor: nested.hintColor ?? raw.hintColor,
    warningColor: nested.warningColor ?? raw.warningColor,
    stepPillBackgroundColor: nested.stepPillBackgroundColor ?? raw.stepPillBackgroundColor,
    stepPillTextColor: nested.stepPillTextColor ?? raw.stepPillTextColor,
    kindPillBackgroundColor: nested.kindPillBackgroundColor ?? raw.kindPillBackgroundColor,
    kindPillTextColor: nested.kindPillTextColor ?? raw.kindPillTextColor,
    primaryButtonBackgroundColor:
      nested.primaryButtonBackgroundColor ?? raw.primaryButtonBackgroundColor,
    primaryButtonTextColor: nested.primaryButtonTextColor ?? raw.primaryButtonTextColor,
    primaryButtonBorderColor: nested.primaryButtonBorderColor ?? raw.primaryButtonBorderColor,
    primaryButtonHoverBackgroundColor:
      nested.primaryButtonHoverBackgroundColor ?? raw.primaryButtonHoverBackgroundColor,
    primaryButtonHoverBorderColor:
      nested.primaryButtonHoverBorderColor ?? raw.primaryButtonHoverBorderColor,
    ghostButtonBackgroundColor: nested.ghostButtonBackgroundColor ?? raw.ghostButtonBackgroundColor,
    ghostButtonTextColor: nested.ghostButtonTextColor ?? raw.ghostButtonTextColor,
    ghostButtonBorderColor: nested.ghostButtonBorderColor ?? raw.ghostButtonBorderColor,
    timerTrackColor: nested.timerTrackColor ?? raw.timerTrackColor,
    timerFillColor: nested.timerFillColor ?? raw.timerFillColor,
  };
  return parseTheme(merged);
}

function buildMetaFromRaw(raw: Record<string, unknown>): GuideMeta {
  const theme = parseMetaTheme(raw);
  return {
    id:
      typeof raw.id === "string" && raw.id.trim().length > 0
        ? raw.id.trim()
        : "guide",
    title: toOptionalTrimmedString(raw.title) ?? "",
    buttonLabel: toOptionalTrimmedString(raw.buttonLabel),
    tooltipTitle: toOptionalTrimmedString(raw.tooltipTitle),
    tooltipPlacement: parseTooltipPlacement(
      raw.tooltipPlacement ?? raw.tooltipPosition
    ),
    overlayColor: toOptionalTrimmedString(raw.overlayColor),
    highlightColor: toOptionalTrimmedString(raw.highlightColor),
    tooltipWidth: typeof raw.tooltipWidth === "number" ? raw.tooltipWidth : undefined,
    showHighlight: typeof raw.showHighlight === "boolean" ? raw.showHighlight : undefined,
    draggable: typeof raw.draggable === "boolean" ? raw.draggable : undefined,
    highlightStyle: parseHighlightStyle(raw.highlightStyle),
    highlightAnimation: parseHighlightAnimation(raw.highlightAnimation),
    tooltipTemplate:
      parseTooltipTemplate(raw.tooltipTemplate ?? raw.tooltipVariant ?? raw.template) ??
      theme?.tooltipTemplate,
    i18n: parseMetaI18n(raw),
    theme,
  };
}

function parseStep(
  headingLabel: string,
  parsed: Record<string, unknown>,
  fallbackIndex: number
): GuideStep {
  const defaultId = slugify(headingLabel) || `step-${fallbackIndex}`;
  const showAutoAdvanceProgress =
    typeof parsed.showAutoAdvanceProgress === "boolean"
      ? parsed.showAutoAdvanceProgress
      : typeof parsed.showTimerLoading === "boolean"
      ? parsed.showTimerLoading
      : undefined;
  const autoAdvanceMs =
    typeof parsed.autoAdvanceMs === "number"
      ? parsed.autoAdvanceMs
      : typeof parsed.durationMs === "number"
      ? parsed.durationMs
      : typeof parsed.timeoutMs === "number"
      ? parsed.timeoutMs
      : undefined;
  const i18n = parseMetaI18n(parsed);
  const theme = parseMetaTheme(parsed);

  return {
    id:
      typeof parsed.id === "string" && parsed.id.trim().length > 0
        ? parsed.id.trim()
        : defaultId,
    target: toStringOrEmpty(parsed.target),
    title: toStringOrEmpty(parsed.title) || headingLabel,
    kind: (toStringOrEmpty(parsed.kind) || "Action") as GuideKind,
    description: toStringOrEmpty(parsed.description),
    tooltipPlacement: parseTooltipPlacement(
      parsed.tooltipPlacement ?? parsed.tooltipPosition
    ),
    allowSkip:
      typeof parsed.allowSkip === "boolean" ? parsed.allowSkip : undefined,
    skippable:
      typeof parsed.skippable === "boolean" ? parsed.skippable : undefined,
    advanceOn:
      typeof parsed.advanceOn === "string"
        ? (parsed.advanceOn as GuideAdvanceMode)
        : undefined,
    inputIdleMs:
      typeof parsed.inputIdleMs === "number" ? parsed.inputIdleMs : undefined,
    showHighlight:
      typeof parsed.showHighlight === "boolean" ? parsed.showHighlight : undefined,
    highlightColor: toOptionalTrimmedString(parsed.highlightColor),
    draggable:
      typeof parsed.draggable === "boolean" ? parsed.draggable : undefined,
    highlightStyle: parseHighlightStyle(parsed.highlightStyle),
    highlightAnimation: parseHighlightAnimation(parsed.highlightAnimation),
    tooltipTemplate:
      parseTooltipTemplate(parsed.tooltipTemplate ?? parsed.tooltipVariant ?? parsed.template) ??
      theme?.tooltipTemplate,
    autoAdvanceMs,
    showAutoAdvanceProgress,
    mustClickTarget:
      typeof parsed.mustClickTarget === "boolean" ? parsed.mustClickTarget : undefined,
    mustEnterValue:
      typeof parsed.mustEnterValue === "boolean" ? parsed.mustEnterValue : undefined,
    i18n,
    theme,
  };
}

function parseGuideFromMarkdown(markdown: string): {
  guide: GuideDefinition | null;
  issues: GuideIssue[];
} {
  const issues: GuideIssue[] = [];
  const { lines, bodyStartLine, frontmatter } = parseFrontmatter(markdown, issues);

  const steps: GuideStep[] = [];
  const stepLineMap = new Map<string, number>();

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = /^##\s*Step:\s*(.+)\s*$/.exec(line.trim());
    if (!match) {
      continue;
    }

    const headingLine = bodyStartLine + i;
    const headingLabel = match[1].trim();

    let cursor = i + 1;
    while (cursor < lines.length && !lines[cursor].trim()) {
      cursor += 1;
    }

    if (cursor >= lines.length) {
      issues.push({
        code: "MD_STEP_BLOCK_MISSING",
        line: headingLine,
        message: `Step \"${headingLabel}\" is missing a fenced yaml/json block.`,
        hint: "Add ```yaml ... ``` after step heading.",
      });
      continue;
    }

    const fenceMatch = /^```(yaml|yml|json)\s*$/.exec(lines[cursor].trim());
    if (!fenceMatch) {
      issues.push({
        code: "MD_STEP_BLOCK_MISSING",
        line: headingLine,
        message: `Step \"${headingLabel}\" must start with a fenced yaml/json block.`,
        hint: "Expected ```yaml or ```json.",
      });
      continue;
    }

    const lang = fenceMatch[1] === "json" ? "json" : "yaml";
    const blockStartLine = bodyStartLine + cursor;
    const buffer: string[] = [];
    cursor += 1;

    let closed = false;
    for (; cursor < lines.length; cursor += 1) {
      if (lines[cursor].trim() === "```") {
        closed = true;
        break;
      }
      buffer.push(lines[cursor]);
    }

    if (!closed) {
      issues.push({
        code: "MD_STEP_BLOCK_MISSING",
        line: blockStartLine,
        message: `Step \"${headingLabel}\" block is not closed with \`\`\`.`,
      });
      break;
    }

    const parsed = parseConfigBlock(buffer.join("\n"), lang, blockStartLine, issues);
    if (!parsed) {
      i = cursor;
      continue;
    }

    const step = parseStep(headingLabel, parsed, steps.length + 1);
    steps.push(step);
    stepLineMap.set(step.id, headingLine);
    i = cursor;
  }

  const meta = buildMetaFromRaw(frontmatter as Record<string, unknown>);
  const guide: GuideDefinition = { meta, steps };
  issues.push(...validateGuideDefinition(guide, stepLineMap));

  return {
    guide: issues.length > 0 ? null : guide,
    issues,
  };
}

function parseGuideFromStructuredObject(
  rootRaw: unknown,
  source: "json" | "yaml"
): {
  guide: GuideDefinition | null;
  issues: GuideIssue[];
} {
  const issues: GuideIssue[] = [];
  const root = asRecord(rootRaw);

  if (!root) {
    issues.push({
      code: "GUIDE_SOURCE_INVALID",
      message: `${source.toUpperCase()} guide root must be an object.`,
      hint: 'Expected shape: { "meta": { ... }, "steps": [ ... ] }',
    });
    return { guide: null, issues };
  }

  const rawSteps = root.steps;
  const steps: GuideStep[] = [];

  if (!Array.isArray(rawSteps)) {
    issues.push({
      code: "GUIDE_SOURCE_INVALID",
      message: `${source.toUpperCase()} guide must include a steps array.`,
      hint: 'Add "steps": [{ id, target, kind, title, description }]',
    });
  } else {
    rawSteps.forEach((rawStep, index) => {
      const parsedStep = asRecord(rawStep);
      if (!parsedStep) {
        issues.push({
          code: "GUIDE_SOURCE_INVALID",
          message: `Step at index ${index} in ${source.toUpperCase()} must be an object.`,
        });
        return;
      }

      const headingLabel =
        toOptionalTrimmedString(parsedStep.title) ??
        toOptionalTrimmedString(parsedStep.id) ??
        `Step ${index + 1}`;
      steps.push(parseStep(headingLabel, parsedStep, index + 1));
    });
  }

  const rawMeta = asRecord(root.meta) ?? root;
  const guide: GuideDefinition = {
    meta: buildMetaFromRaw(rawMeta),
    steps,
  };

  issues.push(...validateGuideDefinition(guide));

  return {
    guide: issues.length > 0 ? null : guide,
    issues,
  };
}

function parseGuideFromJson(jsonText: string): {
  guide: GuideDefinition | null;
  issues: GuideIssue[];
} {
  try {
    const parsed = JSON.parse(jsonText);
    return parseGuideFromStructuredObject(parsed, "json");
  } catch (error) {
    return {
      guide: null,
      issues: [
        {
          code: "GUIDE_SOURCE_INVALID",
          message: `JSON guide is invalid: ${
            error instanceof Error ? error.message : "Unknown parse error"
          }`,
          hint: 'Expected shape: { "meta": { ... }, "steps": [ ... ] }',
        },
      ],
    };
  }
}

function parseGuideFromYaml(yamlText: string): {
  guide: GuideDefinition | null;
  issues: GuideIssue[];
} {
  try {
    const parsed = loadYaml(yamlText);
    return parseGuideFromStructuredObject(parsed, "yaml");
  } catch (error) {
    return {
      guide: null,
      issues: [
        {
          code: "GUIDE_SOURCE_INVALID",
          message: `YAML guide is invalid: ${
            error instanceof Error ? error.message : "Unknown parse error"
          }`,
          hint: "Expected YAML object with meta and steps fields.",
        },
      ],
    };
  }
}

function hasMarkdownStepHeading(text: string): boolean {
  return /^##\s*Step:\s*(.+)\s*$/m.test(text);
}

function looksLikeStructuredYaml(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return false;
  return /(^|\n)\s*steps\s*:/.test(text);
}

export function parseGuideContentSafe(
  content: string,
  options: ParseGuideOptions = {}
): {
  guide: GuideDefinition | null;
  issues: GuideIssue[];
} {
  const format = options.format ?? "auto";

  if (format === "markdown") {
    return parseGuideFromMarkdown(content);
  }

  if (format === "json") {
    return parseGuideFromJson(content);
  }

  if (format === "yaml") {
    return parseGuideFromYaml(content);
  }

  if (hasMarkdownStepHeading(content)) {
    return parseGuideFromMarkdown(content);
  }

  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseGuideFromJson(content);
  }

  if (looksLikeStructuredYaml(content)) {
    return parseGuideFromYaml(content);
  }

  return parseGuideFromMarkdown(content);
}

export function parseGuideContent(
  content: string,
  options: ParseGuideOptions = {}
): GuideDefinition {
  const result = parseGuideContentSafe(content, options);
  if (!result.guide) {
    throw new GuideParseError(result.issues, "Guide content is invalid");
  }
  return result.guide;
}

// Backward-compatible alias. Now supports markdown/json/yaml when format is auto.
export function parseGuideMarkdownSafe(markdown: string): {
  guide: GuideDefinition | null;
  issues: GuideIssue[];
} {
  return parseGuideContentSafe(markdown, { format: "auto" });
}

// Backward-compatible alias. Now supports markdown/json/yaml when format is auto.
export function parseGuideMarkdown(markdown: string): GuideDefinition {
  return parseGuideContent(markdown, { format: "auto" });
}
