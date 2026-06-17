import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { formatGuideIssues } from "./errors";
import {
  filterGuideByFeatures,
  type GuideFeatureInput,
} from "./featureGuides";
import { parseGuideContentSafe } from "./parser";
import { SpotlightGuideOverlay } from "./SpotlightGuideOverlay";
import type { SpotlightExtension } from "./extensions";
import type { SpotlightInstance } from "./spotlight";
import type { GuideDefinition, GuideIssue, GuideSourceFormat } from "./types";
import { useSpotlightInstance } from "./SpotlightContext";

export interface FeatureReleaseNoteItem {
  id: string;
  title: string;
  description?: string;
  badge?: string;
  icon?: ReactNode;
  accentColor?: string;
  accentBackgroundColor?: string;
  featureId?: string;
  featureIds?: GuideFeatureInput;
  tags?: GuideFeatureInput;
  stepIds?: GuideFeatureInput;
  required?: boolean;
  ctaLabel?: string;
  repeatCtaLabel?: string;
  acknowledgeLabel?: string;
  viewedLabel?: string;
  guideTitle?: string;
}

type ThemeSizeValue = string | number;

export interface FeatureReleaseNotesTheme {
  fontFamily?: string;
  backdropColor?: string;
  backdropBlur?: string;
  cardBackgroundColor?: string;
  cardTextColor?: string;
  mutedTextColor?: string;
  borderColor?: string;
  shadow?: string;
  panelBackgroundColor?: string;
  footerBackgroundColor?: string;
  itemBackgroundColor?: string;
  viewedItemBackgroundColor?: string;
  headerBackground?: string;
  headerAccentColor?: string;
  headerIconBackgroundColor?: string;
  headerIconBorderColor?: string;
  headerIconColor?: string;
  badgeBackgroundColor?: string;
  badgeTextColor?: string;
  requiredColor?: string;
  requiredBackgroundColor?: string;
  requiredBorderColor?: string;
  viewedColor?: string;
  viewedBackgroundColor?: string;
  viewedBorderColor?: string;
  actionBackgroundColor?: string;
  actionBorderColor?: string;
  actionTextColor?: string;
  actionHoverBackgroundColor?: string;
  actionHoverBorderColor?: string;
  dismissBackgroundColor?: string;
  dismissBorderColor?: string;
  dismissTextColor?: string;
  dismissHoverBackgroundColor?: string;
  dismissHoverBorderColor?: string;
  disabledDismissBackgroundColor?: string;
  disabledDismissBorderColor?: string;
  disabledDismissTextColor?: string;
  cardBorderRadius?: ThemeSizeValue;
  itemBorderRadius?: ThemeSizeValue;
  iconBorderRadius?: ThemeSizeValue;
  actionButtonBorderRadius?: ThemeSizeValue;
  dismissButtonBorderRadius?: ThemeSizeValue;
}

export interface FeatureReleaseNotesDismissEvent {
  releaseId: string;
  acknowledgedItemIds: string[];
}

export interface FeatureReleaseNotesGuideAllEvent {
  releaseId: string;
  items: FeatureReleaseNoteItem[];
}

export interface FeatureReleaseNotesProps {
  id: string;
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  headerIcon?: ReactNode;
  items: FeatureReleaseNoteItem[];
  content?: string;
  markdown?: string;
  format?: GuideSourceFormat;
  storageKey?: string;
  disabled?: boolean;
  open?: boolean;
  forceRequired?: boolean;
  allowRepeatGuideViews?: boolean;
  showItemIcons?: boolean;
  showItemBadges?: boolean;
  showRequiredBadges?: boolean;
  showViewedBadges?: boolean;
  showGuideAll?: boolean;
  guideAllLabel?: string;
  guideAllRepeatLabel?: string;
  guideAllTitle?: string;
  dismissLabel?: string;
  requiredHint?: string;
  theme?: FeatureReleaseNotesTheme;
  className?: string;
  style?: CSSProperties;
  overlayZIndex?: number;
  popupZIndex?: number;
  onOpenChange?: (open: boolean) => void;
  onDismiss?: (event: FeatureReleaseNotesDismissEvent) => void;
  onItemAcknowledge?: (item: FeatureReleaseNoteItem) => void;
  onItemGuideRequest?: (item: FeatureReleaseNoteItem) => boolean | void;
  onItemGuideStart?: (item: FeatureReleaseNoteItem, guide: GuideDefinition) => void;
  onItemGuideClose?: (item: FeatureReleaseNoteItem | null) => void;
  onGuideAllRequest?: (event: FeatureReleaseNotesGuideAllEvent) => boolean | void;
  onGuideAllStart?: (event: FeatureReleaseNotesGuideAllEvent, guide: GuideDefinition) => void;
  onGuideAllClose?: (event: FeatureReleaseNotesGuideAllEvent) => void;
  onParseError?: (issues: GuideIssue[]) => void;
  instance?: SpotlightInstance;
  extension?: SpotlightExtension;
}

interface StoredState {
  dismissed?: boolean;
  acknowledgedItemIds?: string[];
}

const DEFAULT_TITLE = "Change Log";
const DEFAULT_EYEBROW = "New updates";
const DEFAULT_DISMISS_LABEL = "Got it";
const DEFAULT_REQUIRED_HINT = "Review required updates to continue.";
const DEFAULT_GUIDE_ALL_LABEL = "Guide all features";

type ReleaseCssVars = CSSProperties & {
  [key: `--msgt-release-${string}`]: string | undefined;
};

type ReleaseItemStyle = CSSProperties & {
  [key: `--msgt-release-item-${string}`]: string | undefined;
};

function hasDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function normalizeList(value: GuideFeatureInput): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value !== "string") return [];
  return value
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

function readStoredState(storageKey: string): StoredState {
  if (!hasDom()) return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredState;
    return {
      dismissed: parsed.dismissed === true,
      acknowledgedItemIds: Array.isArray(parsed.acknowledgedItemIds)
        ? parsed.acknowledgedItemIds.filter((entry) => typeof entry === "string")
        : [],
    };
  } catch {
    return {};
  }
}

function writeStoredState(storageKey: string, state: StoredState) {
  if (!hasDom()) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private modes; the component still works for the session.
  }
}

function hasGuideFilter(item: FeatureReleaseNoteItem) {
  return Boolean(
    item.featureId ||
      normalizeList(item.featureIds).length > 0 ||
      normalizeList(item.tags).length > 0 ||
      normalizeList(item.stepIds).length > 0
  );
}

function getItemFeatureIds(item: FeatureReleaseNoteItem) {
  return unique([
    ...normalizeList(item.featureId),
    ...normalizeList(item.featureIds),
  ]);
}

function getGuideFiltersForItems(items: FeatureReleaseNoteItem[]) {
  return {
    featureIds: unique(items.flatMap((item) => getItemFeatureIds(item))),
    tags: unique(items.flatMap((item) => normalizeList(item.tags))),
    stepIds: unique(items.flatMap((item) => normalizeList(item.stepIds))),
  };
}

function getReleaseItemStyle(item: FeatureReleaseNoteItem): ReleaseItemStyle | undefined {
  const style: ReleaseItemStyle = {};
  if (item.accentColor) {
    style["--msgt-release-item-accent"] = item.accentColor;
  }
  if (item.accentBackgroundColor) {
    style["--msgt-release-item-accent-bg"] = item.accentBackgroundColor;
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

function toCssValue(value: ThemeSizeValue | undefined): string | undefined {
  if (typeof value === "number") return `${value}px`;
  return value;
}

function getReleaseThemeStyle(theme: FeatureReleaseNotesTheme | undefined): ReleaseCssVars | undefined {
  if (!theme) return undefined;

  const style: ReleaseCssVars = {};
  const assign = (name: `--msgt-release-${string}`, value: string | undefined) => {
    if (value) {
      style[name] = value;
    }
  };
  const assignSize = (name: `--msgt-release-${string}`, value: ThemeSizeValue | undefined) => {
    const cssValue = toCssValue(value);
    if (cssValue) {
      style[name] = cssValue;
    }
  };

  assign("--msgt-release-font-family", theme.fontFamily);
  assign("--msgt-release-backdrop", theme.backdropColor);
  assign("--msgt-release-backdrop-blur", theme.backdropBlur);
  assign("--msgt-release-surface", theme.cardBackgroundColor);
  assign("--msgt-release-text", theme.cardTextColor);
  assign("--msgt-release-muted", theme.mutedTextColor);
  assign("--msgt-release-border", theme.borderColor);
  assign("--msgt-release-shadow", theme.shadow);
  assign("--msgt-release-panel-bg", theme.panelBackgroundColor);
  assign("--msgt-release-footer-bg", theme.footerBackgroundColor);
  assign("--msgt-release-item-bg", theme.itemBackgroundColor);
  assign("--msgt-release-item-viewed-bg", theme.viewedItemBackgroundColor);
  assign("--msgt-release-header-bg", theme.headerBackground);
  assign("--msgt-release-header-accent", theme.headerAccentColor);
  assign("--msgt-release-header-icon-bg", theme.headerIconBackgroundColor);
  assign("--msgt-release-header-icon-border", theme.headerIconBorderColor);
  assign("--msgt-release-header-icon-color", theme.headerIconColor);
  assign("--msgt-release-badge-bg", theme.badgeBackgroundColor);
  assign("--msgt-release-badge-text", theme.badgeTextColor);
  assign("--msgt-release-required", theme.requiredColor);
  assign("--msgt-release-required-bg", theme.requiredBackgroundColor);
  assign("--msgt-release-required-border", theme.requiredBorderColor);
  assign("--msgt-release-viewed", theme.viewedColor);
  assign("--msgt-release-viewed-bg", theme.viewedBackgroundColor);
  assign("--msgt-release-viewed-border", theme.viewedBorderColor);
  assign("--msgt-release-action-bg", theme.actionBackgroundColor);
  assign("--msgt-release-action-border", theme.actionBorderColor);
  assign("--msgt-release-action-text", theme.actionTextColor);
  assign("--msgt-release-action-hover-bg", theme.actionHoverBackgroundColor);
  assign("--msgt-release-action-hover-border", theme.actionHoverBorderColor);
  assign("--msgt-release-dismiss-bg", theme.dismissBackgroundColor);
  assign("--msgt-release-dismiss-border", theme.dismissBorderColor);
  assign("--msgt-release-dismiss-text", theme.dismissTextColor);
  assign("--msgt-release-dismiss-hover-bg", theme.dismissHoverBackgroundColor);
  assign("--msgt-release-dismiss-hover-border", theme.dismissHoverBorderColor);
  assign("--msgt-release-dismiss-disabled-bg", theme.disabledDismissBackgroundColor);
  assign("--msgt-release-dismiss-disabled-border", theme.disabledDismissBorderColor);
  assign("--msgt-release-dismiss-disabled-text", theme.disabledDismissTextColor);
  assignSize("--msgt-release-card-radius", theme.cardBorderRadius);
  assignSize("--msgt-release-item-radius", theme.itemBorderRadius);
  assignSize("--msgt-release-icon-radius", theme.iconBorderRadius);
  assignSize("--msgt-release-action-radius", theme.actionButtonBorderRadius);
  assignSize("--msgt-release-dismiss-radius", theme.dismissButtonBorderRadius);

  return Object.keys(style).length > 0 ? style : undefined;
}

export function FeatureReleaseNotes({
  id,
  title = DEFAULT_TITLE,
  eyebrow = DEFAULT_EYEBROW,
  subtitle,
  headerIcon,
  items,
  content,
  markdown,
  format = "auto",
  storageKey,
  disabled = false,
  open,
  forceRequired = true,
  allowRepeatGuideViews = true,
  showItemIcons = true,
  showItemBadges = true,
  showRequiredBadges = true,
  showViewedBadges = true,
  showGuideAll = false,
  guideAllLabel = DEFAULT_GUIDE_ALL_LABEL,
  guideAllRepeatLabel,
  guideAllTitle,
  dismissLabel = DEFAULT_DISMISS_LABEL,
  requiredHint = DEFAULT_REQUIRED_HINT,
  theme,
  className,
  style,
  overlayZIndex,
  popupZIndex = 2147482500,
  onOpenChange,
  onDismiss,
  onItemAcknowledge,
  onItemGuideRequest,
  onItemGuideStart,
  onItemGuideClose,
  onGuideAllRequest,
  onGuideAllStart,
  onGuideAllClose,
  onParseError,
  instance: instanceProp,
  extension: extensionProp,
}: FeatureReleaseNotesProps) {
  const contextInstance = useSpotlightInstance();
  const instance = instanceProp ?? contextInstance;
  const ext = extensionProp ?? instance?.extension;
  const effectiveStorageKey = storageKey ?? `rotaguide:release-notes:${id}`;
  const isControlled = typeof open === "boolean";

  const [storedState, setStoredState] = useState<StoredState>({ acknowledgedItemIds: [] });
  const [hydrated, setHydrated] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [activeGuide, setActiveGuide] = useState<GuideDefinition | null>(null);
  const [activeItem, setActiveItem] = useState<FeatureReleaseNoteItem | null>(null);
  const [activeGuideItems, setActiveGuideItems] = useState<FeatureReleaseNoteItem[]>([]);
  const [errorIssues, setErrorIssues] = useState<GuideIssue[] | null>(null);

  const guideContent = content ?? markdown ?? "";
  const parseResult = useMemo(
    () => parseGuideContentSafe(guideContent, { format }),
    [guideContent, format]
  );

  useEffect(() => {
    const stored = readStoredState(effectiveStorageKey);
    setStoredState(stored);
    setHydrated(true);
    if (!disabled && !stored.dismissed && !isControlled && items.length > 0) {
      setInternalOpen(true);
      onOpenChange?.(true);
    }
  }, [disabled, effectiveStorageKey, isControlled, items.length, onOpenChange]);

  const acknowledgedIds = storedState.acknowledgedItemIds ?? [];
  const acknowledgedSet = useMemo(() => new Set(acknowledgedIds), [acknowledgedIds]);
  const requiredItems = useMemo(() => items.filter((item) => item.required), [items]);
  const guideItems = useMemo(() => items.filter(hasGuideFilter), [items]);
  const requiredComplete = requiredItems.every((item) => acknowledgedSet.has(item.id));
  const guideItemsComplete = guideItems.every((item) => acknowledgedSet.has(item.id));
  const dismissBlocked = forceRequired && requiredItems.length > 0 && !requiredComplete;
  const popupOpen = isControlled ? Boolean(open) : internalOpen;
  const shouldRenderPopup = hydrated && !disabled && popupOpen && !guideOpen;

  const setPopupOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  const updateStored = useCallback(
    (updater: (previous: StoredState) => StoredState) => {
      setStoredState((previous) => {
        const next = updater(previous);
        writeStoredState(effectiveStorageKey, next);
        return next;
      });
    },
    [effectiveStorageKey]
  );

  const acknowledgeItems = useCallback(
    (nextItems: FeatureReleaseNoteItem[]) => {
      updateStored((previous) => ({
        ...previous,
        acknowledgedItemIds: unique([
          ...(previous.acknowledgedItemIds ?? []),
          ...nextItems.map((item) => item.id),
        ]),
      }));
      nextItems.forEach((item) => onItemAcknowledge?.(item));
    },
    [onItemAcknowledge, updateStored]
  );

  const dismiss = useCallback(() => {
    if (dismissBlocked) return;
    const finalAcknowledgedIds = storedState.acknowledgedItemIds ?? [];
    updateStored((previous) => ({
      ...previous,
      dismissed: true,
      acknowledgedItemIds: previous.acknowledgedItemIds ?? [],
    }));
    setPopupOpen(false);
    onDismiss?.({
      releaseId: id,
      acknowledgedItemIds: finalAcknowledgedIds,
    });
  }, [dismissBlocked, id, onDismiss, setPopupOpen, storedState.acknowledgedItemIds, updateStored]);

  const startGuideForItems = useCallback(
    (nextItems: FeatureReleaseNoteItem[], mode: "single" | "all") => {
      const nextGuideItems = nextItems.filter(hasGuideFilter);

      if (nextGuideItems.length === 0) {
        acknowledgeItems(nextItems);
        return;
      }

      if (mode === "single") {
        const item = nextGuideItems[0];
        if (onItemGuideRequest?.(item) === false) {
          acknowledgeItems([item]);
          return;
        }
      }

      const guideAllEvent: FeatureReleaseNotesGuideAllEvent = {
        releaseId: id,
        items: nextGuideItems,
      };

      if (mode === "all" && onGuideAllRequest?.(guideAllEvent) === false) {
        acknowledgeItems(nextGuideItems);
        return;
      }

      if (!parseResult.guide) {
        setErrorIssues(parseResult.issues);
        onParseError?.(parseResult.issues);
        return;
      }

      const filters = getGuideFiltersForItems(nextGuideItems);
      const singleItem = mode === "single" ? nextGuideItems[0] : null;
      const featureGuide = filterGuideByFeatures(parseResult.guide, {
        featureIds: filters.featureIds,
        tags: filters.tags,
        stepIds: filters.stepIds,
        meta: {
          id:
            mode === "single"
              ? `${parseResult.guide.meta.id}-${singleItem?.id ?? "feature"}`
              : `${parseResult.guide.meta.id}-feature-release`,
          title:
            mode === "single"
              ? singleItem?.guideTitle ?? singleItem?.title ?? parseResult.guide.meta.title
              : guideAllTitle ?? title,
          tooltipTitle:
            mode === "single"
              ? singleItem?.guideTitle ?? singleItem?.title ?? parseResult.guide.meta.title
              : guideAllTitle ?? title,
        },
      });

      acknowledgeItems(nextGuideItems);

      if (featureGuide.steps.length === 0) {
        return;
      }

      setActiveItem(singleItem);
      setActiveGuideItems(nextGuideItems);
      setActiveGuide(featureGuide);
      setGuideOpen(true);
      if (mode === "single" && singleItem) {
        onItemGuideStart?.(singleItem, featureGuide);
      } else {
        onGuideAllStart?.(guideAllEvent, featureGuide);
      }
    },
    [
      acknowledgeItems,
      guideAllTitle,
      id,
      onGuideAllRequest,
      onGuideAllStart,
      onItemGuideRequest,
      onItemGuideStart,
      onParseError,
      parseResult.guide,
      parseResult.issues,
      title,
    ]
  );

  const startGuideForItem = useCallback(
    (item: FeatureReleaseNoteItem) => startGuideForItems([item], "single"),
    [startGuideForItems]
  );

  const startGuideForAll = useCallback(
    () => startGuideForItems(guideItems, "all"),
    [guideItems, startGuideForItems]
  );

  const closeGuide = useCallback(() => {
    const item = activeItem;
    const itemsForGuide = activeGuideItems;
    setGuideOpen(false);
    setActiveGuide(null);
    setActiveItem(null);
    setActiveGuideItems([]);
    if (item) {
      onItemGuideClose?.(item);
      return;
    }
    if (itemsForGuide.length > 0) {
      onGuideAllClose?.({ releaseId: id, items: itemsForGuide });
    }
  }, [activeGuideItems, activeItem, id, onGuideAllClose, onItemGuideClose]);

  const closeError = useCallback(() => setErrorIssues(null), []);
  const releaseThemeStyle = useMemo(() => getReleaseThemeStyle(theme), [theme]);
  const showGuideAllAction = showGuideAll && guideItems.length > 1;
  const guideAllActionLabel = guideItemsComplete
    ? guideAllRepeatLabel ?? guideAllLabel
    : guideAllLabel;

  if (!hasDom()) return null;

  const popup = shouldRenderPopup ? (
    <div
      className="msgt-release-root"
      style={{ zIndex: popupZIndex, ...releaseThemeStyle }}
    >
      <div
        className="msgt-release-backdrop"
        onClick={dismissBlocked ? undefined : dismiss}
      />
      <section
        className={`msgt-release-card ${
          !showItemIcons ? "msgt-release-card--no-item-icons" : ""
        } ${className ?? ""}`.trim()}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby="msgt-release-title"
      >
        <div className="msgt-release-header">
          <div className="msgt-release-heading">
            {headerIcon ? (
              <span className="msgt-release-header-icon" aria-hidden="true">
                {headerIcon}
              </span>
            ) : null}
            <div className="msgt-release-heading-copy">
              {eyebrow ? <p className="msgt-release-eyebrow">{eyebrow}</p> : null}
              <h2 id="msgt-release-title" className="msgt-release-title">
                {title}
              </h2>
              {subtitle ? <p className="msgt-release-subtitle">{subtitle}</p> : null}
            </div>
          </div>
          {requiredItems.length > 0 ? (
            <span className="msgt-release-required-count">
              {requiredItems.filter((item) => acknowledgedSet.has(item.id)).length}/
              {requiredItems.length} required
            </span>
          ) : null}
        </div>

        <div className="msgt-release-list">
          {items.map((item) => {
            const viewed = acknowledgedSet.has(item.id);
            const canRunGuide = hasGuideFilter(item);
            const itemActionLabel = canRunGuide
              ? viewed
                ? item.repeatCtaLabel ?? item.ctaLabel ?? "View again"
                : item.ctaLabel ?? "Show me"
              : item.acknowledgeLabel ?? "Mark as read";
            const showItemAction = canRunGuide
              ? allowRepeatGuideViews || !viewed
              : item.required && !viewed;
            const showBadgeRow =
              showItemBadges &&
              Boolean(
                item.badge ||
                  (item.required && showRequiredBadges) ||
                  (viewed && showViewedBadges)
              );

            return (
              <article
                key={item.id}
                className={`msgt-release-item ${viewed ? "msgt-release-item-viewed" : ""}`.trim()}
                style={getReleaseItemStyle(item)}
              >
                {showItemIcons ? (
                  <span className="msgt-release-item-icon" aria-hidden="true">
                    {item.icon ?? <span className="msgt-release-item-dot" />}
                  </span>
                ) : null}
                <div className="msgt-release-item-main">
                  {showBadgeRow ? (
                    <div className="msgt-release-item-meta">
                      {item.badge ? <span className="msgt-release-badge">{item.badge}</span> : null}
                      {item.required && showRequiredBadges ? (
                        <span className="msgt-release-badge msgt-release-badge-required">
                          Required
                        </span>
                      ) : null}
                      {viewed && showViewedBadges ? (
                        <span className="msgt-release-badge msgt-release-badge-viewed">
                          {item.viewedLabel ?? "Viewed"}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <h3 className="msgt-release-item-title">{item.title}</h3>
                  {item.description ? (
                    <p className="msgt-release-item-description">{item.description}</p>
                  ) : null}
                </div>
                {showItemAction ? (
                  <button
                    type="button"
                    className="msgt-release-item-action"
                    onClick={() => startGuideForItem(item)}
                  >
                    {itemActionLabel}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="msgt-release-footer">
          {dismissBlocked ? (
            <p className="msgt-release-required-hint">{requiredHint}</p>
          ) : <span />}
          <div className="msgt-release-footer-actions">
            {showGuideAllAction ? (
              <button
                type="button"
                className="msgt-release-guide-all"
                onClick={startGuideForAll}
              >
                {guideAllActionLabel}
              </button>
            ) : null}
            <button
              type="button"
              className="msgt-release-dismiss"
              onClick={dismiss}
              disabled={dismissBlocked}
            >
              {dismissLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  ) : null;

  const errorDialog = errorIssues ? (
    <div className="msgt-error-root" role="dialog" aria-modal="true">
      <div className="msgt-error-backdrop" onClick={closeError} />
      <div className="msgt-error-card">
        <h3 className="msgt-error-title">Guide content is invalid</h3>
        <p className="msgt-error-subtitle">
          Fix the markdown/json/yaml format and try again.
        </p>
        <pre className="msgt-error-list">{formatGuideIssues(errorIssues)}</pre>
        <div className="msgt-error-actions">
          <button type="button" className="msgt-btn msgt-btn-primary" onClick={closeError}>
            Close
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {popup ? createPortal(popup, document.body) : null}
      {activeGuide ? (
        <SpotlightGuideOverlay
          open={guideOpen}
          guide={activeGuide}
          onClose={closeGuide}
          zIndex={overlayZIndex}
          instance={instance ?? undefined}
          extension={ext}
        />
      ) : null}
      {errorDialog ? createPortal(errorDialog, document.body) : null}
    </>
  );
}
