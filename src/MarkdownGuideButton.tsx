import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { formatGuideIssues } from "./errors";
import { parseGuideContentSafe } from "./parser";
import { SpotlightGuideOverlay } from "./SpotlightGuideOverlay";
import type { GuideDefinition, GuideIssue, GuideSourceFormat } from "./types";

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
}: MarkdownGuideButtonProps) {
  const [open, setOpen] = useState(false);
  const [errorIssues, setErrorIssues] = useState<GuideIssue[] | null>(null);

  const guideContent = content ?? markdown ?? "";
  const parseResult = useMemo(
    () => parseGuideContentSafe(guideContent, { format }),
    [guideContent, format]
  );
  const parsedGuide = parseResult.guide;

  const buttonLabel =
    label ?? parsedGuide?.meta.buttonLabel ?? "Start Guide";

  const runGuide = () => {
    if (disabled) return;

    if (!parsedGuide) {
      setErrorIssues(parseResult.issues);
      onParseError?.(parseResult.issues);
      return;
    }

    setErrorIssues(null);
    setOpen(true);
    onGuideStart?.(parsedGuide);
  };

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
        renderButton({ onClick: runGuide, label: buttonLabel, disabled })
      ) : (
        <button
          type="button"
          className={`msgt-btn msgt-btn-primary ${className ?? ""}`.trim()}
          style={style}
          disabled={disabled}
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
