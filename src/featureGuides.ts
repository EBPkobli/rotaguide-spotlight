import { defineExtension, type SpotlightExtension } from "./extensions";
import type { GuideDefinition, GuideMeta, GuideStep } from "./types";

export type GuideFeatureInput = string | string[] | undefined;
export type GuideFeatureMatchMode = "any" | "all";

export interface GuideFeatureFilterOptions {
  featureIds?: GuideFeatureInput;
  includeFeatureIds?: GuideFeatureInput;
  include?: GuideFeatureInput;
  tags?: GuideFeatureInput;
  includeTags?: GuideFeatureInput;
  stepIds?: GuideFeatureInput;
  excludeFeatureIds?: GuideFeatureInput;
  exclude?: GuideFeatureInput;
  excludeTags?: GuideFeatureInput;
  mode?: GuideFeatureMatchMode;
  meta?: Partial<GuideMeta>;
}

function normalizeList(value: GuideFeatureInput): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  return trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  values.forEach((value) => {
    if (seen.has(value)) return;
    seen.add(value);
    ordered.push(value);
  });
  return ordered;
}

function matches(candidateValues: string[], requestedValues: string[], mode: GuideFeatureMatchMode) {
  if (requestedValues.length === 0) return false;
  if (mode === "all") {
    return requestedValues.every((value) => candidateValues.includes(value));
  }
  return requestedValues.some((value) => candidateValues.includes(value));
}

export function getGuideStepFeatureIds(step: GuideStep): string[] {
  return unique([
    ...normalizeList(step.featureId),
    ...normalizeList(step.featureIds),
  ]);
}

export function getGuideStepTags(step: GuideStep): string[] {
  return unique(normalizeList(step.tags));
}

export function filterGuideByFeatures(
  guide: GuideDefinition,
  options: GuideFeatureFilterOptions
): GuideDefinition {
  const includeFeatureIds = unique([
    ...normalizeList(options.featureIds),
    ...normalizeList(options.includeFeatureIds),
    ...normalizeList(options.include),
  ]);
  const includeTags = unique([
    ...normalizeList(options.tags),
    ...normalizeList(options.includeTags),
  ]);
  const includeStepIds = unique(normalizeList(options.stepIds));
  const excludeFeatureIds = unique([
    ...normalizeList(options.excludeFeatureIds),
    ...normalizeList(options.exclude),
  ]);
  const excludeTags = unique(normalizeList(options.excludeTags));
  const mode = options.mode ?? "any";
  const hasIncludeFilter =
    includeFeatureIds.length > 0 || includeTags.length > 0 || includeStepIds.length > 0;

  const steps = guide.steps.filter((step) => {
    const stepFeatureIds = getGuideStepFeatureIds(step);
    const stepTags = getGuideStepTags(step);

    if (
      matches(stepFeatureIds, excludeFeatureIds, "any") ||
      matches(stepTags, excludeTags, "any")
    ) {
      return false;
    }

    if (!hasIncludeFilter) return true;
    if (includeStepIds.includes(step.id)) return true;
    if (matches(stepFeatureIds, includeFeatureIds, mode)) return true;
    if (matches(stepTags, includeTags, mode)) return true;
    return false;
  });

  return {
    meta: {
      ...guide.meta,
      ...(options.meta ?? {}),
    },
    steps,
  };
}

export function createFeatureGuideExtension(
  options: GuideFeatureFilterOptions & { name?: string }
): SpotlightExtension {
  return defineExtension({
    name: options.name ?? "feature-guide-filter",
    transformGuide(guide) {
      return filterGuideByFeatures(guide, options);
    },
  });
}
