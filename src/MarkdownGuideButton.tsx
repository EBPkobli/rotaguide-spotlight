import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { formatGuideIssues } from "./errors";
import { parseGuideContentSafe } from "./parser";
import { SpotlightGuideOverlay } from "./SpotlightGuideOverlay";
import type { GuideDefinition, GuideIssue, GuideSourceFormat } from "./types";
import type { SpotlightExtension } from "./extensions";
import type { SpotlightInstance } from "./spotlight";
import { useSpotlightInstance } from "./SpotlightContext";

export interface MarkdownGuideButtonProps {
  markdown?: string;
  content?: string;
  format?: GuideSourceFormat;
  label?: string;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  overlayZIndex?: number;
  renderButton?: (params: {
    onClick: () => void;
    label: string;
    disabled: boolean;
  }) => ReactNode;
  onGuideStart?: (guide: GuideDefinition) => void;
  onGuideClose?: () => void;
  onParseError?: (issues: GuideIssue[]) => void;
  /** Called when canStartGuide returns false. */
  onAccessDenied?: (guide: GuideDefinition) => void;
  /** Spotlight instance for extensions/presets. */
  instance?: SpotlightInstance;
  /** Inline extension (convenience shortcut). */
  extension?: SpotlightExtension;
}

export function MarkdownGuideButton({
  markdown,
  content,
  format = "auto",
  label,
  className,
  style,
  disabled = false,
  overlayZIndex,
  renderButton,
  onGuideStart,
  onGuideClose,
  onParseError,
  onAccessDenied,
  instance: instanceProp,
  extension: extensionProp,
}: MarkdownGuideButtonProps) {
  const contextInstance = useSpotlightInstance();
  const instance = instanceProp ?? contextInstance;
  const ext: SpotlightExtension | undefined =
    extensionProp ?? instance?.extension;

  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errorIssues, setErrorIssues] = useState<GuideIssue[] | null>(null);

  const guideContent = content ?? markdown ?? "";
  const parseResult = useMemo(
    () => parseGuideContentSafe(guideContent, { format }),
    [guideContent, format]
  );
  const parsedGuide = parseResult.guide;

  const buttonLabel =
    label ?? parsedGuide?.meta.buttonLabel ?? "Start Guide";

  const runGuide = useCallback(async () => {
    if (disabled || checking) return;

    if (!parsedGuide) {
      setErrorIssues(parseResult.issues);
      onParseError?.(parseResult.issues);
      return;
    }

    // Run canStartGuide check if extension provides it
    if (ext?.canStartGuide) {
      setChecking(true);
      try {
        const allowed = await ext.canStartGuide({
          guideId: parsedGuide.meta.id,
          guide: parsedGuide,
        });
        if (!allowed) {
          onAccessDenied?.(parsedGuide);
          setChecking(false);
          return;
        }
      } catch {
        onAccessDenied?.(parsedGuide);
        setChecking(false);
        return;
      }
      setChecking(false);
    }

    setErrorIssues(null);
    setOpen(true);
    onGuideStart?.(parsedGuide);
  }, [checking, disabled, ext, onAccessDenied, onGuideStart, onParseError, parseResult.issues, parsedGuide]);

  const closeGuide = () => {
    setOpen(false);
    onGuideClose?.();
  };

  const closeError = () => {
    setErrorIssues(null);
  };

  return (
    <>
      {renderButton ? (
        renderButton({ onClick: runGuide, label: buttonLabel, disabled: disabled || checking })
      ) : (
        <button
          type="button"
          className={`msgt-btn msgt-btn-primary ${className ?? ""}`.trim()}
          style={style}
          disabled={disabled || checking}
          onClick={runGuide}
        >
          {buttonLabel}
        </button>
      )}

      {parsedGuide && (
        <SpotlightGuideOverlay
          open={open}
          guide={parsedGuide}
          onClose={closeGuide}
          zIndex={overlayZIndex}
          instance={instance ?? undefined}
          extension={ext}
        />
      )}

      {errorIssues && (
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
      )}
    </>
  );
}
