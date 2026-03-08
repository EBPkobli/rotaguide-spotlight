import { useMemo, useState, type CSSProperties, type JSX, type ReactNode } from "react";
import { formatGuideIssues } from "./errors";
import { parseGuideContentSafe } from "./parser";
import { SpotlightGuideOverlay } from "./SpotlightGuideOverlay";
import type { GuideDefinition, GuideIssue, GuideSourceFormat } from "./types";

export type GuideTriggerEvent = "click" | "hover" | "focus";
type TriggerWrapperElement = keyof JSX.IntrinsicElements & string;

export interface MarkdownGuideTriggerRenderParams {
  startGuide: () => void;
  label: string;
  disabled: boolean;
  triggerProps: {
    onClick?: () => void;
    onMouseEnter?: () => void;
    onFocus?: () => void;
  };
}

export interface MarkdownGuideTriggerProps {
  markdown?: string;
  content?: string;
  format?: GuideSourceFormat;
  triggerOn?: GuideTriggerEvent | GuideTriggerEvent[];
  as?: TriggerWrapperElement;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  overlayZIndex?: number;
  children: ReactNode | ((params: MarkdownGuideTriggerRenderParams) => ReactNode);
  onGuideStart?: (guide: GuideDefinition) => void;
  onGuideClose?: () => void;
  onParseError?: (issues: GuideIssue[]) => void;
}

export function MarkdownGuideTrigger({
  markdown,
  content,
  format = "auto",
  triggerOn = "click",
  as = "span",
  className,
  style,
  disabled = false,
  overlayZIndex,
  children,
  onGuideStart,
  onGuideClose,
  onParseError,
}: MarkdownGuideTriggerProps) {
  const [open, setOpen] = useState(false);
  const [errorIssues, setErrorIssues] = useState<GuideIssue[] | null>(null);

  const guideContent = content ?? markdown ?? "";
  const parseResult = useMemo(
    () => parseGuideContentSafe(guideContent, { format }),
    [guideContent, format]
  );
  const parsedGuide = parseResult.guide;
  const guideLabel = parsedGuide?.meta.buttonLabel ?? "Start Guide";

  const normalizedTriggers = useMemo(() => {
    const source = Array.isArray(triggerOn) ? triggerOn : [triggerOn];
    const unique = Array.from(new Set(source));
    return unique.filter((value): value is GuideTriggerEvent =>
      value === "click" || value === "hover" || value === "focus"
    );
  }, [triggerOn]);

  const startGuide = () => {
    if (disabled || open) return;

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

  const triggerProps = useMemo(() => {
    const handlers: MarkdownGuideTriggerRenderParams["triggerProps"] = {};

    if (normalizedTriggers.includes("click")) {
      handlers.onClick = startGuide;
    }
    if (normalizedTriggers.includes("hover")) {
      handlers.onMouseEnter = startGuide;
    }
    if (normalizedTriggers.includes("focus")) {
      handlers.onFocus = startGuide;
    }

    return handlers;
  }, [normalizedTriggers, startGuide]);

  const triggerNode =
    typeof children === "function" ? (
      children({
        startGuide,
        label: guideLabel,
        disabled,
        triggerProps,
      })
    ) : (
      (() => {
        const Wrapper = as;
        return (
          <Wrapper
            className={className}
            style={style}
            aria-disabled={disabled || undefined}
            {...triggerProps}
          >
            {children}
          </Wrapper>
        );
      })()
    );

  return (
    <>
      {triggerNode}

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
