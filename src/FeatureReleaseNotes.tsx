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
  acknowledgeLabel?: string;
  viewedLabel?: string;
  guideTitle?: string;
}

export interface FeatureReleaseNotesDismissEvent {
  releaseId: string;
  acknowledgedItemIds: string[];
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
  dismissLabel?: string;
  requiredHint?: string;
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

type ReleaseItemStyle = CSSProperties & {
  "--msgt-release-item-accent"?: string;
  "--msgt-release-item-accent-bg"?: string;
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
  dismissLabel = DEFAULT_DISMISS_LABEL,
  requiredHint = DEFAULT_REQUIRED_HINT,
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
  const requiredComplete = requiredItems.every((item) => acknowledgedSet.has(item.id));
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

  const acknowledgeItem = useCallback(
    (item: FeatureReleaseNoteItem) => {
      updateStored((previous) => ({
        ...previous,
        acknowledgedItemIds: unique([...(previous.acknowledgedItemIds ?? []), item.id]),
      }));
      onItemAcknowledge?.(item);
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

  const startGuideForItem = useCallback(
    (item: FeatureReleaseNoteItem) => {
      if (!hasGuideFilter(item)) {
        acknowledgeItem(item);
        return;
      }

      if (onItemGuideRequest?.(item) === false) {
        acknowledgeItem(item);
        return;
      }

      if (!parseResult.guide) {
        setErrorIssues(parseResult.issues);
        onParseError?.(parseResult.issues);
        return;
      }

      const featureGuide = filterGuideByFeatures(parseResult.guide, {
        featureIds: getItemFeatureIds(item),
        tags: item.tags,
        stepIds: item.stepIds,
        meta: {
          id: `${parseResult.guide.meta.id}-${item.id}`,
          title: item.guideTitle ?? item.title,
          tooltipTitle: item.guideTitle ?? item.title,
        },
      });

      acknowledgeItem(item);

      if (featureGuide.steps.length === 0) {
        return;
      }

      setActiveItem(item);
      setActiveGuide(featureGuide);
      setGuideOpen(true);
      onItemGuideStart?.(item, featureGuide);
    },
    [
      acknowledgeItem,
      onItemGuideRequest,
      onItemGuideStart,
      onParseError,
      parseResult.guide,
      parseResult.issues,
    ]
  );

  const closeGuide = useCallback(() => {
    const item = activeItem;
    setGuideOpen(false);
    setActiveGuide(null);
    setActiveItem(null);
    onItemGuideClose?.(item);
  }, [activeItem, onItemGuideClose]);

  const closeError = useCallback(() => setErrorIssues(null), []);

  if (!hasDom()) return null;

  const popup = shouldRenderPopup ? (
    <div className="msgt-release-root" style={{ zIndex: popupZIndex }}>
      <div
        className="msgt-release-backdrop"
        onClick={dismissBlocked ? undefined : dismiss}
      />
      <section
        className={`msgt-release-card ${className ?? ""}`.trim()}
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
              ? item.ctaLabel ?? "Show me"
              : item.acknowledgeLabel ?? "Mark as read";

            return (
              <article
                key={item.id}
                className={`msgt-release-item ${viewed ? "msgt-release-item-viewed" : ""}`.trim()}
                style={getReleaseItemStyle(item)}
              >
                <span className="msgt-release-item-icon" aria-hidden="true">
                  {item.icon ?? <span className="msgt-release-item-dot" />}
                </span>
                <div className="msgt-release-item-main">
                  <div className="msgt-release-item-meta">
                    {item.badge ? <span className="msgt-release-badge">{item.badge}</span> : null}
                    {item.required ? (
                      <span className="msgt-release-badge msgt-release-badge-required">
                        Required
                      </span>
                    ) : null}
                    {viewed ? (
                      <span className="msgt-release-badge msgt-release-badge-viewed">
                        {item.viewedLabel ?? "Viewed"}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="msgt-release-item-title">{item.title}</h3>
                  {item.description ? (
                    <p className="msgt-release-item-description">{item.description}</p>
                  ) : null}
                </div>
                {(canRunGuide || item.required) && !viewed ? (
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
          <button
            type="button"
            className="msgt-release-dismiss"
            onClick={dismiss}
            disabled={dismissBlocked}
          >
            {dismissLabel}
          </button>
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
