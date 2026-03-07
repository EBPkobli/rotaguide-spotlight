import { useMemo, useState } from "react";
import {
  GUIDE_TOOLTIP_TEMPLATES,
  GuideParseError,
  MarkdownGuideButton,
  guideTarget,
  parseGuideContent,
  parseGuideContentSafe,
  parseGuideMarkdown,
  parseGuideMarkdownSafe,
  type GuideTooltipTemplate,
  type GuideIssue,
} from "../../../src";
import guideMarkdown from "./create-booking.guide.md?raw";
import guideJson from "./create-booking.guide.json?raw";
import guideYaml from "./create-booking.guide.yaml?raw";

const invalidGuideMarkdown = `---
id: invalid-demo
title: Invalid Markdown Demo
---

## Step: Broken Step
\
\
\
`;

const invalidGuideJson = `{
  "meta": {
    "id": "broken-json",
    "title": "Broken JSON Guide"
  },
  "steps": [
    {
      "id": "s1",
      "target": "open-create",
      "kind": "Action"
    }
  ]
}`;

type VariantLocale = "en" | "tr" | "da";

function buildTemplateVariantGuide(template: GuideTooltipTemplate, locale: VariantLocale) {
  return `---
id: template-${template}
title: Tooltip Variant ${template}
buttonLabel: Start ${template}
tooltipTemplate: ${template}
i18n:
  locale: ${locale}
showHighlight: true
---

## Step: Preview Tooltip Variant
\`\`\`yaml
id: preview-${template}
target: variant-trigger-${template}
kind: Action
title: Template preview ${template}
description: Previewing tooltip template variant ${template}.
advanceOn: none
skippable: true
\`\`\`
`;
}

function buildPlacementGuide(placement: "top" | "right" | "left" | "bottom") {
  return `---
id: placement-${placement}
title: Tooltip Placement ${placement}
buttonLabel: Placement ${placement}
i18n:
  locale: en
showHighlight: true
highlightStyle: line
highlightAnimation: none
---

## Step: Placement Demo
\`\`\`yaml
id: placement-${placement}
target: placement-demo-target
componentIds:
  - placement-btn-top
  - placement-btn-right
  - placement-btn-left
  - placement-btn-bottom
kind: Action
title: "Tooltip placement: ${placement}"
description: "This preview locks the tooltip to ${placement} side and spotlights all placement buttons."
tooltipPlacement: ${placement}
highlightStyle: line
highlightAnimation: none
advanceOn: none
skippable: true
\`\`\`
`;
}

export default function App() {
  const [customerName, setCustomerName] = useState("");
  const [plan, setPlan] = useState("");
  const [notifyByEmail, setNotifyByEmail] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [savedName, setSavedName] = useState("");
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [parseIssues, setParseIssues] = useState<GuideIssue[]>([]);
  const [throwingParseSummary, setThrowingParseSummary] = useState("");
  const [throwingContentParseSummary, setThrowingContentParseSummary] = useState("");
  const [variantLocale, setVariantLocale] = useState<VariantLocale>("en");

  const validSafeParse = useMemo(() => parseGuideMarkdownSafe(guideMarkdown), []);
  const invalidSafeParse = useMemo(() => parseGuideMarkdownSafe(invalidGuideMarkdown), []);
  const jsonSafeParse = useMemo(
    () => parseGuideContentSafe(guideJson, { format: "json" }),
    []
  );
  const yamlSafeParse = useMemo(
    () => parseGuideContentSafe(guideYaml, { format: "yaml" }),
    []
  );
  const variantGuides = useMemo(
    () =>
      GUIDE_TOOLTIP_TEMPLATES.map((template) => ({
        template,
        content: buildTemplateVariantGuide(template, variantLocale),
      })),
    [variantLocale]
  );
  const placementGuides = useMemo(
    () => ({
      top: buildPlacementGuide("top"),
      right: buildPlacementGuide("right"),
      left: buildPlacementGuide("left"),
      bottom: buildPlacementGuide("bottom"),
    }),
    []
  );

  const pushEvent = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog((prev) => [`${timestamp} - ${message}`, ...prev].slice(0, 8));
  };

  const runThrowingParse = () => {
    try {
      parseGuideMarkdown(invalidGuideMarkdown);
      setThrowingParseSummary("Unexpected: parseGuideMarkdown did not throw.");
    } catch (error) {
      if (error instanceof GuideParseError) {
        const first = error.issues[0];
        setThrowingParseSummary(
          `GuideParseError with ${error.issues.length} issue(s). First: [${first?.code ?? "N/A"}]`
        );
        return;
      }
      setThrowingParseSummary("parseGuideMarkdown threw an unknown error type.");
    }
  };

  const runThrowingContentParse = () => {
    try {
      parseGuideContent(invalidGuideJson, { format: "json" });
      setThrowingContentParseSummary("Unexpected: parseGuideContent did not throw.");
    } catch (error) {
      if (error instanceof GuideParseError) {
        const first = error.issues[0];
        setThrowingContentParseSummary(
          `GuideParseError with ${error.issues.length} issue(s). First: [${first?.code ?? "N/A"}]`
        );
        return;
      }
      setThrowingContentParseSummary("parseGuideContent threw an unknown error type.");
    }
  };

  return (
    <main className="demo-page">
      <div className="demo-shell">
        <header className="hero" {...guideTarget("guide-start-panel")}>
          <div className="hero-badge">New: Markdown + JSON + YAML Support</div>
          <h1 className="hero-title">RotaGuide Spotlight</h1>
          <p className="hero-subtitle">
            Create powerful, interactive product walkthroughs using markdown-driven steps with
            strict validation and real-time overlays.
          </p>

          <div className="hero-actions">
            <MarkdownGuideButton
              markdown={guideMarkdown}
              label="Start Full Feature Guide"
              className="hero-primary-guide"
              style={{ minHeight: 44, paddingInline: 18 }}
              overlayZIndex={4600}
              onGuideStart={(guide) => pushEvent(`onGuideStart: ${guide.meta.id}`)}
              onGuideClose={() => pushEvent("onGuideClose: main guide")}
            />

            <MarkdownGuideButton
              markdown={guideMarkdown}
              label="Start Guide (renderButton)"
              onGuideStart={(guide) => pushEvent(`onGuideStart(renderButton): ${guide.meta.id}`)}
              onGuideClose={() => pushEvent("onGuideClose: renderButton guide")}
              renderButton={({ onClick, label, disabled }) => (
                <button type="button" className="ghost-btn" onClick={onClick} disabled={disabled}>
                  {label}
                </button>
              )}
            />

            <MarkdownGuideButton markdown={guideMarkdown} label="Disabled Guide Button" disabled />
          </div>

          <div className="hero-tip">
            <kbd>Esc</kbd>
            <span>Close guide at any time</span>
          </div>
        </header>

        <section className="workspace-header">
          <h2>Live Workspace</h2>
          <span>Interactive</span>
        </section>

        <section className="trigger-wrap">
          <button className="trigger-btn" {...guideTarget("open-create")} type="button">
            Open Booking Form
          </button>
        </section>

        <section className="glass-card">
          <h3 className="card-title">Booking Details</h3>

          <div className="form-grid">
            <label className="field">
              <span>Customer Name</span>
              <input
                {...guideTarget("customer-name")}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="e.g. John Doe"
              />
            </label>

            <label className="field" {...guideTarget("plan-select")}>
              <span>Plan</span>
              <select value={plan} onChange={(event) => setPlan(event.target.value)}>
                <option value="">Select a plan</option>
                <option value="starter">Starter</option>
                <option value="pro">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
          </div>

          <label className="switch-row" {...guideTarget("notify-toggle")}>
            <span>Send confirmation email</span>
            <input
              type="checkbox"
              checked={notifyByEmail}
              onChange={(event) => setNotifyByEmail(event.target.checked)}
            />
          </label>

          <label className="field" {...guideTarget("manual-note")}>
            <span>Internal Note (manual next step)</span>
            <textarea
              rows={3}
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              placeholder="Notes for staff..."
            />
          </label>

          <div className="chip-row" {...guideTarget("auto-progress-step")}>
            <div className="chip">Auto-advance with visible progress bar</div>
          </div>

          <div className="chip-row" {...guideTarget("auto-hidden-progress-step")}>
            <div className="chip chip-muted">Auto-advance with hidden timer bar (alias mode)</div>
          </div>

          <div className="chip-row" {...guideTarget("list-kind-step")}>
            <div className="note">Kind: List step target area</div>
          </div>

          <div className="chip-row" {...guideTarget("map-kind-step")}>
            <div className="note">Kind: Map Interaction step target area</div>
          </div>

          <div className="chip-row" {...guideTarget("highlight-off-note")}>
            <div className="note">Step-level `showHighlight: false` and `draggable: false`.</div>
          </div>

          <div className="actions-row">
            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                setCustomerName("");
                setPlan("");
                setNotifyByEmail(false);
                setInternalNote("");
              }}
            >
              Reset Form
            </button>

            <button
              id="save-booking-btn"
              className="primary-btn"
              {...guideTarget("save-booking")}
              type="button"
              onClick={() => setSavedName(customerName.trim())}
            >
              Save Booking
            </button>
            <span className="status-text">
              {savedName ? `Saved: ${savedName}` : "No booking saved yet"}
            </span>
          </div>
        </section>

        <section className="section-stack">
          <h2>Step Behavior Flow</h2>
          <ul className="flow-list">
            <li><b>1.</b> `advanceOn: none` with non-skippable step</li>
            <li><b>2.</b> explicit `advanceOn: click` + `mustClickTarget: true`</li>
            <li><b>3.</b> `advanceOn: input-idle`, `inputIdleMs`, `mustEnterValue: true`</li>
            <li><b>4.</b> `advanceOn: change` on select</li>
            <li><b>5.</b> `allowSkip` alias in toggle step</li>
            <li><b>6-13.</b> timer aliases, kinds, missing target, and full CSS selector coverage</li>
          </ul>
        </section>

        <section className="feature-grid">
          <div className="glass-card mini-card">
            <h4>Auto-Progression</h4>
            <div className="fake-progress-track">
              <span className="fake-progress-fill" />
            </div>
            <p>Fallback: step → frontmatter → default</p>
          </div>

          <div className="glass-card mini-card">
            <h4>Highlight Styles</h4>
            <div className="highlight-line">highlightStyle: line</div>
            <div className="highlight-dash">highlightStyle: dash</div>
          </div>

          <div className="glass-card mini-card">
            <h4>Engine Logic</h4>
            <p>Auto mode resolution + draggable tooltip + strict validation</p>
          </div>
        </section>

        <section className="section-stack">
          <h2>Parse & Validation API Demo</h2>

          <div className="actions-row source-format-row">
            <MarkdownGuideButton
              content={guideMarkdown}
              format="markdown"
              label="Run Markdown Source"
              onGuideStart={() => pushEvent("source format: markdown")}
            />
            <MarkdownGuideButton
              content={guideJson}
              format="json"
              label="Run JSON Source"
              onGuideStart={() => pushEvent("source format: json")}
            />
            <MarkdownGuideButton
              content={guideYaml}
              format="yaml"
              label="Run YAML Source"
              onGuideStart={() => pushEvent("source format: yaml")}
            />
            <MarkdownGuideButton
              content={guideMarkdown}
              format="auto"
              label="Run Auto Source Detection"
              onGuideStart={() => pushEvent("source format: auto")}
            />
          </div>

          <div className="parse-grid">
            <div className="note-box">
              <strong>parseGuideMarkdownSafe(valid)</strong>
              <p>guide: {validSafeParse.guide ? "ok" : "null"}</p>
              <p>issues: {validSafeParse.issues.length}</p>
            </div>
            <div className="note-box">
              <strong>parseGuideMarkdownSafe(invalid)</strong>
              <p>guide: {invalidSafeParse.guide ? "ok" : "null"}</p>
              <p>issues: {invalidSafeParse.issues.length}</p>
            </div>
            <div className="note-box">
              <strong>parseGuideContentSafe(json)</strong>
              <p>guide: {jsonSafeParse.guide ? "ok" : "null"}</p>
              <p>issues: {jsonSafeParse.issues.length}</p>
            </div>
            <div className="note-box">
              <strong>parseGuideContentSafe(yaml)</strong>
              <p>guide: {yamlSafeParse.guide ? "ok" : "null"}</p>
              <p>issues: {yamlSafeParse.issues.length}</p>
            </div>
          </div>

          <div className="actions-row">
            <button type="button" className="ghost-btn" onClick={runThrowingParse}>
              Run parseGuideMarkdown (throwing)
            </button>
            <button type="button" className="ghost-btn" onClick={runThrowingContentParse}>
              Run parseGuideContent JSON (throwing)
            </button>
            <MarkdownGuideButton
              markdown={invalidGuideMarkdown}
              label="Run Invalid Markdown Guide"
              onParseError={(issues) => {
                setParseIssues(issues);
                pushEvent(`onParseError: ${issues.length} issue(s)`);
              }}
            />
          </div>

          {throwingParseSummary && <p className="status-text">{throwingParseSummary}</p>}
          {throwingContentParseSummary && (
            <p className="status-text">{throwingContentParseSummary}</p>
          )}

          {parseIssues.length > 0 && (
            <div className="error-box">
              <p>Latest `onParseError` issues</p>
              <ul className="flow-list">
                {parseIssues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`}>
                    [{issue.code}] line {typeof issue.line === "number" ? issue.line : "unknown"} - {issue.message}
                    {issue.hint ? ` (${issue.hint})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="section-stack">
          <h2>Tooltip Template Variants</h2>
          <div className="variant-controls">
            <label className="variant-locale-field">
              <span>Variant Language</span>
              <select
                value={variantLocale}
                onChange={(event) => setVariantLocale(event.target.value as VariantLocale)}
              >
                <option value="en">English (en)</option>
                <option value="tr">Turkish (tr)</option>
                <option value="da">Danish (da)</option>
              </select>
            </label>
          </div>
          <p className="status-text">
            Each button starts a small guide that previews one `tooltipTemplate` variant.
          </p>
          <div className="variant-grid">
            {variantGuides.map((variant) => (
              <MarkdownGuideButton
                key={variant.template}
                content={variant.content}
                format="markdown"
                label={variant.template}
                renderButton={({ onClick, label, disabled }) => (
                  <button
                    type="button"
                    className="ghost-btn variant-btn"
                    {...guideTarget(`variant-trigger-${variant.template}`)}
                    onClick={onClick}
                    disabled={disabled}
                  >
                    {label}
                  </button>
                )}
                onGuideStart={() => pushEvent(`tooltip template: ${variant.template}`)}
              />
            ))}
          </div>
        </section>

        <section className="section-stack">
          <h2>Tooltip Placement Demo</h2>
          <p className="status-text">
            Use these to preview fixed placement modes: top, right, left, and bottom.
          </p>

          <div className="placement-stage">
            <div className="placement-target" {...guideTarget("placement-demo-target")}>
              <span className="placement-side placement-side-top">Top</span>
              <span className="placement-side placement-side-right">Right</span>
              <span className="placement-side placement-side-bottom">Bottom</span>
              <span className="placement-side placement-side-left">Left</span>

              <div className="placement-target-head">
                <h3>Placement Target Card</h3>
                <span>Live Anchor</span>
              </div>

              <p className="placement-target-copy">
                Tooltip side placement is demonstrated on this card. Pick a side below to lock
                the guide tooltip around this exact target area.
              </p>

              <div className="placement-stats">
                <div>
                  <span>Response</span>
                  <strong>118ms</strong>
                </div>
                <div>
                  <span>Uptime</span>
                  <strong>99.98%</strong>
                </div>
                <div>
                  <span>Alerts</span>
                  <strong>2</strong>
                </div>
              </div>

              <div className="placement-target-foot">
                <span>Target ID: placement-demo-target</span>
                <button type="button">Preview Anchor</button>
              </div>
            </div>
          </div>

          <div className="placement-actions">
            <MarkdownGuideButton
              content={placementGuides.top}
              format="markdown"
              label="Top"
              renderButton={({ onClick, label, disabled }) => (
                <button
                  type="button"
                  className="msgt-btn msgt-btn-primary"
                  {...guideTarget("placement-btn-top")}
                  onClick={onClick}
                  disabled={disabled}
                >
                  {label}
                </button>
              )}
            />
            <MarkdownGuideButton
              content={placementGuides.right}
              format="markdown"
              label="Right"
              renderButton={({ onClick, label, disabled }) => (
                <button
                  type="button"
                  className="msgt-btn msgt-btn-primary"
                  {...guideTarget("placement-btn-right")}
                  onClick={onClick}
                  disabled={disabled}
                >
                  {label}
                </button>
              )}
            />
            <MarkdownGuideButton
              content={placementGuides.left}
              format="markdown"
              label="Left"
              renderButton={({ onClick, label, disabled }) => (
                <button
                  type="button"
                  className="msgt-btn msgt-btn-primary"
                  {...guideTarget("placement-btn-left")}
                  onClick={onClick}
                  disabled={disabled}
                >
                  {label}
                </button>
              )}
            />
            <MarkdownGuideButton
              content={placementGuides.bottom}
              format="markdown"
              label="Bottom"
              renderButton={({ onClick, label, disabled }) => (
                <button
                  type="button"
                  className="msgt-btn msgt-btn-primary"
                  {...guideTarget("placement-btn-bottom")}
                  onClick={onClick}
                  disabled={disabled}
                >
                  {label}
                </button>
              )}
            />
          </div>
        </section>

        <section className="section-stack">
          <h2>Event Log</h2>
          {eventLog.length === 0 ? (
            <p className="status-text">No events yet. Start a guide to populate logs.</p>
          ) : (
            <ul className="flow-list">
              {eventLog.map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
