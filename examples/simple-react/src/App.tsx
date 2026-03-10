import { useMemo, useState } from "react";
import {
  GUIDE_TOOLTIP_TEMPLATES,
  GuideParseError,
  MarkdownGuideButton,
  MarkdownGuideTrigger,
  SpotlightGuideOverlay,
  guideTarget,
  parseGuideContent,
  parseGuideContentSafe,
  parseGuideMarkdown,
  parseGuideMarkdownSafe,
  formatGuideIssues,
  type GuideTooltipTemplate,
  type GuideIssue,
  type GuideDefinition,
} from "rotaguide-spotlight";
import guideMarkdown from "./create-booking.guide.md?raw";
import guideJson from "./create-booking.guide.json?raw";
import guideYaml from "./create-booking.guide.yaml?raw";

/* ─── Invalid guides for error demos ─── */
const invalidGuideMarkdown = `---
id: invalid-demo
title: Invalid Markdown Demo
---

## Step: Broken Step
\`\`\`yaml
\`\`\`
`;

const invalidGuideJson = `{
  "meta": { "id": "broken-json", "title": "Broken JSON Guide" },
  "steps": [{ "id": "s1", "target": "open-create", "kind": "Action" }]
}`;

/* ─── Guide content builders ─── */
type VariantLocale = "en" | "tr" | "da";

function buildTemplateGuide(template: GuideTooltipTemplate, locale: VariantLocale) {
  return `---
id: tpl-${template}
title: "Template: ${template}"
tooltipTemplate: ${template}
i18n:
  locale: ${locale}
showHighlight: true
---

## Step: Preview Template
\`\`\`yaml
id: preview-${template}
target: tpl-card-${template}
kind: Action
title: "${template} template"
description: "This is how the ${template} tooltip template looks. Fully customizable."
advanceOn: none
skippable: true
\`\`\`
`;
}

function buildPlacementGuide(placement: "top" | "right" | "bottom" | "left") {
  return `---
id: placement-${placement}
title: "Placement: ${placement}"
showHighlight: true
highlightStyle: line
---

## Step: Placement Demo
\`\`\`yaml
id: pl-${placement}
target: placement-anchor
componentIds:
  - placement-btn-top
  - placement-btn-right
  - placement-btn-bottom
  - placement-btn-left
kind: Action
title: "Tooltip on ${placement}"
description: "The tooltip is locked to the ${placement} side of the target element."
tooltipPlacement: ${placement}
advanceOn: none
skippable: true
\`\`\`
`;
}

function buildHighlightGuide(
  style: "line" | "dash",
  animation: "none" | "color" | "dash" | "color-dash"
) {
  return `---
id: hl-${style}-${animation}
title: "Highlight: ${style} + ${animation}"
showHighlight: true
highlightStyle: ${style}
highlightAnimation: ${animation}
highlightColor: "#f59e0b"
---

## Step: Highlight Preview
\`\`\`yaml
id: hl-step
target: highlight-preview-box
kind: Action
title: "Style: ${style} — Animation: ${animation}"
description: "This shows highlightStyle '${style}' combined with highlightAnimation '${animation}'."
advanceOn: none
skippable: true
\`\`\`
`;
}

function buildAdvanceModeGuide(
  mode: string,
  targetId: string,
  extra: string = ""
) {
  return `---
id: adv-${mode}
title: "AdvanceOn: ${mode}"
showHighlight: true
---

## Step: ${mode} mode
\`\`\`yaml
id: adv-step-${mode}
target: ${targetId}
kind: Input
title: "advanceOn: ${mode}"
description: "This step uses advanceOn '${mode}'. ${mode === "input-idle" ? "Type something and wait." : mode === "change" ? "Change the value." : mode === "click" ? "Click the target." : mode === "none" ? "Use the Next button." : "Auto-resolves per kind."}"
advanceOn: ${mode}
${extra}
skippable: true
\`\`\`
`;
}

function buildKindGuide(kind: string, targetId: string) {
  return `---
id: kind-${kind.toLowerCase().replace(/\s/g, "-")}
title: "Kind: ${kind}"
showHighlight: true
tooltipTemplate: glass
---

## Step: ${kind} kind
\`\`\`yaml
id: kind-step
target: ${targetId}
kind: "${kind}"
title: "Step kind: ${kind}"
description: "Demonstrating the '${kind}' step kind. Each kind influences the default advanceOn behavior."
advanceOn: none
skippable: true
\`\`\`
`;
}

function buildI18nGuide(locale: VariantLocale) {
  const titles: Record<string, string> = {
    en: "English Guide",
    tr: "Türkçe Rehber",
    da: "Dansk Guide",
  };
  return `---
id: i18n-${locale}
title: "${titles[locale]}"
showHighlight: true
tooltipTemplate: clean-white
i18n:
  locale: ${locale}
---

## Step: Localized Step
\`\`\`yaml
id: i18n-step
target: i18n-demo-box
kind: Action
title: "${locale === "en" ? "Localized UI" : locale === "tr" ? "Yerelleştirilmiş Arayüz" : "Lokaliseret UI"}"
description: "${locale === "en" ? "All button labels and messages are shown in English." : locale === "tr" ? "Tüm buton etiketleri ve mesajlar Türkçe gösterilir." : "Alle knaptekster og beskeder vises på dansk."}"
advanceOn: none
skippable: true
\`\`\`
`;
}

function buildThemeGuide(
  name: string,
  theme: Record<string, string | number>
) {
  const themeYaml = Object.entries(theme)
    .map(([k, v]) => `  ${k}: "${v}"`)
    .join("\n");
  return `---
id: theme-${name}
title: "Theme: ${name}"
showHighlight: true
theme:
${themeYaml}
---

## Step: Theme Preview
\`\`\`yaml
id: theme-step
target: theme-demo-box
kind: Action
title: "Custom theme: ${name}"
description: "All tooltip colors, fonts, and pill styles are overridden by the theme object."
advanceOn: none
skippable: true
\`\`\`
`;
}

function buildTriggerGuide(triggerType: string, targetId: string) {
  return `---
id: trigger-${triggerType}
title: "Trigger: ${triggerType}"
showHighlight: true
tooltipTemplate: minimal
---

## Step: Trigger Demo
\`\`\`yaml
id: trigger-step
target: ${targetId}
kind: Action
title: "Triggered by ${triggerType}"
description: "This guide was started using triggerOn='${triggerType}' on a MarkdownGuideTrigger component."
advanceOn: none
skippable: true
\`\`\`
`;
}

function buildMultiTargetGuide() {
  return `---
id: multi-target
title: Multi-Target Spotlight
showHighlight: true
highlightAnimation: color
---

## Step: Multiple Highlights
\`\`\`yaml
id: multi-step
target: multi-target-a
targets:
  - multi-target-a
  - multi-target-b
  - multi-target-c
kind: Action
title: "Multi-target spotlight"
description: "Three elements are highlighted simultaneously. The tooltip anchors to the first resolved target."
advanceOn: none
skippable: true
\`\`\`
`;
}

function buildAutoAdvanceGuide(visible: boolean) {
  return `---
id: auto-adv-${visible ? "visible" : "hidden"}
title: "Auto Advance (${visible ? "Visible Timer" : "Hidden Timer"})"
showHighlight: true
tooltipTemplate: commerce-dark
---

## Step: Timer Demo
\`\`\`yaml
id: timer-step
target: auto-advance-box
kind: Action
title: "${visible ? "Visible progress bar" : "Hidden progress bar"}"
description: "This step auto-advances after 4 seconds ${visible ? "with a visible timer bar" : "without showing the timer bar"}."
advanceOn: none
autoAdvanceMs: 4000
showAutoAdvanceProgress: ${visible}
skippable: true
\`\`\`
`;
}

function buildRequirementsGuide() {
  return `---
id: requirements-demo
title: Step Requirements
showHighlight: true
tooltipTemplate: contrast
---

## Step: Must Click Target
\`\`\`yaml
id: req-click
target: req-click-btn
kind: Action
title: "mustClickTarget"
description: "You must click the highlighted button to advance. Clicking elsewhere won't work."
advanceOn: click
mustClickTarget: true
\`\`\`

## Step: Must Enter Value
\`\`\`yaml
id: req-input
target: req-input-field
kind: Input
title: "mustEnterValue + inputIdleMs"
description: "Type something in the field. The step won't advance until a non-empty value is entered and you stop typing."
advanceOn: input-idle
inputIdleMs: 800
mustEnterValue: true
skippable: true
\`\`\`
`;
}

/* ─── Pre-built themes ─── */
const THEME_PRESETS = {
  ocean: {
    fontFamily: "'Georgia', serif",
    tooltipBackgroundColor: "#0c4a6e",
    tooltipTextColor: "#e0f2fe",
    tooltipBorderColor: "#0284c7",
    tooltipBorderRadius: 16,
    titleColor: "#7dd3fc",
    descriptionColor: "#bae6fd",
    primaryButtonBackgroundColor: "#0ea5e9",
    primaryButtonTextColor: "#fff",
    stepPillBackgroundColor: "#075985",
    stepPillTextColor: "#7dd3fc",
    kindPillBackgroundColor: "#0369a1",
    kindPillTextColor: "#bae6fd",
  },
  sunset: {
    fontFamily: "'Trebuchet MS', sans-serif",
    tooltipBackgroundColor: "#fef3c7",
    tooltipTextColor: "#78350f",
    tooltipBorderColor: "#f59e0b",
    tooltipBorderRadius: 12,
    titleColor: "#92400e",
    descriptionColor: "#a16207",
    primaryButtonBackgroundColor: "#d97706",
    primaryButtonTextColor: "#fff",
    stepPillBackgroundColor: "#fde68a",
    stepPillTextColor: "#92400e",
    kindPillBackgroundColor: "#fcd34d",
    kindPillTextColor: "#78350f",
  },
  neon: {
    fontFamily: "'Courier New', monospace",
    tooltipBackgroundColor: "#020617",
    tooltipTextColor: "#4ade80",
    tooltipBorderColor: "#22c55e",
    tooltipBorderRadius: 4,
    titleColor: "#86efac",
    descriptionColor: "#4ade80",
    primaryButtonBackgroundColor: "#16a34a",
    primaryButtonTextColor: "#f0fdf4",
    stepPillBackgroundColor: "#052e16",
    stepPillTextColor: "#4ade80",
    kindPillBackgroundColor: "#14532d",
    kindPillTextColor: "#86efac",
    tooltipShadow: "0 0 30px rgba(74, 222, 128, 0.3)",
  },
} as const;

/* ─── Nav sections ─── */
const SECTIONS = [
  { id: "hero", label: "Home" },
  { id: "workspace", label: "Workspace" },
  { id: "components", label: "Components" },
  { id: "formats", label: "Formats" },
  { id: "templates", label: "Templates" },
  { id: "placement", label: "Placement" },
  { id: "highlights", label: "Highlights" },
  { id: "behaviors", label: "Behaviors" },
  { id: "i18n-theme", label: "i18n & Theme" },
  { id: "validation", label: "Validation" },
  { id: "events", label: "Events" },
] as const;

/* ═══════════════════════════════════════════════════ */
/*  App                                                */
/* ═══════════════════════════════════════════════════ */
export default function App() {
  /* ── Form state ── */
  const [customerName, setCustomerName] = useState("");
  const [plan, setPlan] = useState("");
  const [notifyByEmail, setNotifyByEmail] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [savedName, setSavedName] = useState("");
  const [reqInput, setReqInput] = useState("");

  /* ── UI state ── */
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [parseIssues, setParseIssues] = useState<GuideIssue[]>([]);
  const [throwResult, setThrowResult] = useState("");
  const [throwContentResult, setThrowContentResult] = useState("");
  const [variantLocale, setVariantLocale] = useState<VariantLocale>("en");
  const [activeNav, setActiveNav] = useState("hero");

  /* ── SpotlightGuideOverlay direct usage ── */
  const [overlayOpen, setOverlayOpen] = useState(false);
  const overlayGuide = useMemo<GuideDefinition | null>(() => {
    const result = parseGuideContentSafe(
      buildTriggerGuide("direct", "overlay-direct-target"),
      { format: "markdown" }
    );
    return result.guide;
  }, []);

  /* ── Pre-parsed results ── */
  const validSafe = useMemo(() => parseGuideMarkdownSafe(guideMarkdown), []);
  const invalidSafe = useMemo(() => parseGuideMarkdownSafe(invalidGuideMarkdown), []);
  const jsonSafe = useMemo(() => parseGuideContentSafe(guideJson, { format: "json" }), []);
  const yamlSafe = useMemo(() => parseGuideContentSafe(guideYaml, { format: "yaml" }), []);

  /* ── Variant guides ── */
  const templateGuides = useMemo(
    () =>
      GUIDE_TOOLTIP_TEMPLATES.map((t) => ({
        template: t,
        content: buildTemplateGuide(t, variantLocale),
      })),
    [variantLocale]
  );
  const placementGuides = useMemo(
    () => ({
      top: buildPlacementGuide("top"),
      right: buildPlacementGuide("right"),
      bottom: buildPlacementGuide("bottom"),
      left: buildPlacementGuide("left"),
    }),
    []
  );

  /* ── Helpers ── */
  const pushEvent = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setEventLog((p) => [`${ts} — ${msg}`, ...p].slice(0, 20));
  };

  const scrollTo = (id: string) => {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const runThrowingParse = () => {
    try {
      parseGuideMarkdown(invalidGuideMarkdown);
      setThrowResult("Unexpected: did not throw.");
    } catch (err) {
      if (err instanceof GuideParseError) {
        setThrowResult(
          `GuideParseError — ${err.issues.length} issue(s)\n${formatGuideIssues(err.issues)}`
        );
      } else {
        setThrowResult("Unknown error type thrown.");
      }
    }
  };

  const runThrowingContentParse = () => {
    try {
      parseGuideContent(invalidGuideJson, { format: "json" });
      setThrowContentResult("Unexpected: did not throw.");
    } catch (err) {
      if (err instanceof GuideParseError) {
        setThrowContentResult(
          `GuideParseError — ${err.issues.length} issue(s)\n${formatGuideIssues(err.issues)}`
        );
      } else {
        setThrowContentResult("Unknown error type thrown.");
      }
    }
  };

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <div className="app">
      {/* ── Sticky Nav ── */}
      <nav className="top-nav">
        <div className="nav-inner">
          <span className="nav-logo">RotaGuide</span>
          <div className="nav-links">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`nav-link ${activeNav === s.id ? "nav-link--active" : ""}`}
                onClick={() => scrollTo(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="main">
        {/* ══════════ HERO ══════════ */}
        <section id="hero" className="hero" {...guideTarget("guide-start-panel")}>
          <div className="hero-badge">Feature Showcase</div>
          <h1 className="hero-title">RotaGuide Spotlight</h1>
          <p className="hero-sub">
            The complete interactive product tour library for React. Explore every feature below — click any button to see it live.
          </p>

          <div className="hero-stats">
            <div className="stat"><span className="stat-num">9</span><span className="stat-label">Templates</span></div>
            <div className="stat"><span className="stat-num">7</span><span className="stat-label">Step Kinds</span></div>
            <div className="stat"><span className="stat-num">5</span><span className="stat-label">Advance Modes</span></div>
            <div className="stat"><span className="stat-num">3</span><span className="stat-label">Formats</span></div>
            <div className="stat"><span className="stat-num">3</span><span className="stat-label">Locales</span></div>
          </div>

          <div className="hero-actions">
            <MarkdownGuideButton
              content={guideMarkdown}
              format="markdown"
              label="Start Full Feature Tour"
              className="hero-cta"
              overlayZIndex={5000}
              onGuideStart={(g) => pushEvent(`onGuideStart → ${g.meta.id}`)}
              onGuideClose={() => pushEvent("onGuideClose → full tour")}
            />
            <MarkdownGuideButton
              content={guideMarkdown}
              format="markdown"
              disabled
              label="Disabled State"
              className="btn-ghost"
            />
          </div>

          <p className="hero-hint"><kbd>Esc</kbd> closes guides at any time</p>
        </section>

        {/* ══════════ WORKSPACE ══════════ */}
        <section id="workspace" className="section">
          <div className="section-head">
            <h2>Interactive Workspace</h2>
            <span className="badge badge--orange">Live Form</span>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Booking Details</h3>
            </div>

            <div className="form-row">
              <button className="btn-outline" {...guideTarget("open-create")} type="button">
                Open Booking Form
              </button>
            </div>

            <div className="form-grid">
              <label className="field">
                <span className="field-label">Customer Name</span>
                <input
                  {...guideTarget("customer-name")}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </label>
              <label className="field" {...guideTarget("plan-select")}>
                <span className="field-label">Plan</span>
                <select value={plan} onChange={(e) => setPlan(e.target.value)}>
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
                onChange={(e) => setNotifyByEmail(e.target.checked)}
              />
            </label>

            <label className="field" {...guideTarget("manual-note")}>
              <span className="field-label">Internal Note</span>
              <textarea
                rows={2}
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Notes for staff..."
              />
            </label>

            <div className="chip-row" {...guideTarget("auto-progress-step")}>
              <span className="chip">Auto-advance (visible timer bar)</span>
            </div>
            <div className="chip-row" {...guideTarget("auto-hidden-progress-step")}>
              <span className="chip chip--muted">Auto-advance (hidden timer bar)</span>
            </div>
            <div className="chip-row" {...guideTarget("list-kind-step")}>
              <span className="chip chip--muted">Kind: List step target</span>
            </div>
            <div className="chip-row" {...guideTarget("map-kind-step")}>
              <span className="chip chip--muted">Kind: Map Interaction target</span>
            </div>
            <div className="chip-row" {...guideTarget("highlight-off-note")}>
              <span className="chip chip--muted">showHighlight: false / draggable: false</span>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setCustomerName("");
                  setPlan("");
                  setNotifyByEmail(false);
                  setInternalNote("");
                }}
              >
                Reset
              </button>
              <button
                id="save-booking-btn"
                className="btn-primary"
                {...guideTarget("save-booking")}
                type="button"
                onClick={() => setSavedName(customerName.trim())}
              >
                Save Booking
              </button>
              <span className="status-text">
                {savedName ? `Saved: ${savedName}` : "No booking saved"}
              </span>
            </div>
          </div>
        </section>

        {/* ══════════ COMPONENTS ══════════ */}
        <section id="components" className="section">
          <div className="section-head">
            <h2>Components</h2>
            <span className="badge badge--blue">3 Components</span>
          </div>

          <div className="grid-3">
            {/* MarkdownGuideButton */}
            <div className="card card--feature">
              <div className="feature-icon">🔘</div>
              <h4>MarkdownGuideButton</h4>
              <p>Ready-to-use button that parses content and starts guides.</p>
              <div className="card-actions">
                <MarkdownGuideButton
                  content={guideMarkdown}
                  format="markdown"
                  label="Default Button"
                  onGuideStart={(g) => pushEvent(`MarkdownGuideButton → ${g.meta.id}`)}
                  onGuideClose={() => pushEvent("MarkdownGuideButton → closed")}
                />
              </div>
              <div className="card-actions">
                <MarkdownGuideButton
                  content={guideMarkdown}
                  format="markdown"
                  label="Custom via renderButton"
                  renderButton={({ onClick, label, disabled }) => (
                    <button type="button" className="btn-ghost" onClick={onClick} disabled={disabled}>
                      ✨ {label}
                    </button>
                  )}
                  onGuideStart={(g) => pushEvent(`renderButton → ${g.meta.id}`)}
                  onGuideClose={() => pushEvent("renderButton → closed")}
                />
              </div>
            </div>

            {/* MarkdownGuideTrigger */}
            <div className="card card--feature">
              <div className="feature-icon">🎯</div>
              <h4>MarkdownGuideTrigger</h4>
              <p>Flexible wrapper — trigger guides on click, hover, or focus.</p>
              <div className="card-actions">
                <MarkdownGuideTrigger
                  content={buildTriggerGuide("click", "trigger-click-demo")}
                  format="markdown"
                  triggerOn="click"
                  onGuideStart={() => pushEvent("Trigger → click")}
                >
                  <button type="button" className="btn-ghost" {...guideTarget("trigger-click-demo")}>
                    Click Trigger
                  </button>
                </MarkdownGuideTrigger>
              </div>
              <div className="card-actions">
                <MarkdownGuideTrigger
                  content={buildTriggerGuide("hover", "trigger-hover-demo")}
                  format="markdown"
                  triggerOn="hover"
                  onGuideStart={() => pushEvent("Trigger → hover")}
                >
                  <span className="hover-target" {...guideTarget("trigger-hover-demo")}>
                    Hover over me
                  </span>
                </MarkdownGuideTrigger>
              </div>
              <div className="card-actions">
                <MarkdownGuideTrigger
                  content={buildTriggerGuide("focus", "trigger-focus-demo")}
                  format="markdown"
                  triggerOn="focus"
                  as="div"
                  onGuideStart={() => pushEvent("Trigger → focus")}
                >
                  <input
                    className="focus-input"
                    placeholder="Focus me to start guide"
                    readOnly
                    {...guideTarget("trigger-focus-demo")}
                  />
                </MarkdownGuideTrigger>
              </div>
              <div className="card-actions">
                <MarkdownGuideTrigger
                  content={buildTriggerGuide("render-fn", "trigger-renderfn-demo")}
                  format="markdown"
                  triggerOn="click"
                  onGuideStart={() => pushEvent("Trigger → render function")}
                >
                  {({ startGuide, label }) => (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={startGuide}
                      {...guideTarget("trigger-renderfn-demo")}
                    >
                      🎨 {label}
                    </button>
                  )}
                </MarkdownGuideTrigger>
              </div>
            </div>

            {/* SpotlightGuideOverlay */}
            <div className="card card--feature">
              <div className="feature-icon">🖼️</div>
              <h4>SpotlightGuideOverlay</h4>
              <p>Low-level component — control open/close state directly.</p>
              <div className="card-actions">
                <button
                  type="button"
                  className="btn-primary"
                  {...guideTarget("overlay-direct-target")}
                  onClick={() => {
                    setOverlayOpen(true);
                    pushEvent("SpotlightGuideOverlay → opened directly");
                  }}
                >
                  Open Overlay Directly
                </button>
              </div>
              <p className="card-note">
                Uses <code>open</code>, <code>guide</code>, and <code>onClose</code> props for manual control.
              </p>
              {overlayGuide && (
                <SpotlightGuideOverlay
                  open={overlayOpen}
                  guide={overlayGuide}
                  onClose={() => {
                    setOverlayOpen(false);
                    pushEvent("SpotlightGuideOverlay → closed");
                  }}
                  zIndex={5000}
                />
              )}
            </div>
          </div>
        </section>

        {/* ══════════ FORMATS ══════════ */}
        <section id="formats" className="section">
          <div className="section-head">
            <h2>Format Support</h2>
            <span className="badge badge--green">MD · JSON · YAML · Auto</span>
          </div>

          <div className="grid-4">
            <div className="card card--compact">
              <h4>Markdown</h4>
              <p className="mono-sm">.guide.md</p>
              <MarkdownGuideButton
                content={guideMarkdown}
                format="markdown"
                label="Run Markdown"
                onGuideStart={() => pushEvent("Format → markdown")}
              />
            </div>
            <div className="card card--compact">
              <h4>JSON</h4>
              <p className="mono-sm">.guide.json</p>
              <MarkdownGuideButton
                content={guideJson}
                format="json"
                label="Run JSON"
                onGuideStart={() => pushEvent("Format → json")}
              />
            </div>
            <div className="card card--compact">
              <h4>YAML</h4>
              <p className="mono-sm">.guide.yaml</p>
              <MarkdownGuideButton
                content={guideYaml}
                format="yaml"
                label="Run YAML"
                onGuideStart={() => pushEvent("Format → yaml")}
              />
            </div>
            <div className="card card--compact">
              <h4>Auto-Detect</h4>
              <p className="mono-sm">format: "auto"</p>
              <MarkdownGuideButton
                content={guideMarkdown}
                format="auto"
                label="Run Auto"
                onGuideStart={() => pushEvent("Format → auto")}
              />
            </div>
          </div>
        </section>

        {/* ══════════ TEMPLATES ══════════ */}
        <section id="templates" className="section">
          <div className="section-head">
            <h2>Tooltip Templates</h2>
            <span className="badge badge--purple">9 Built-in Variants</span>
          </div>

          <div className="locale-picker">
            <span>Preview locale:</span>
            <select
              value={variantLocale}
              onChange={(e) => setVariantLocale(e.target.value as VariantLocale)}
            >
              <option value="en">English</option>
              <option value="tr">Türkçe</option>
              <option value="da">Dansk</option>
            </select>
          </div>

          <div className="grid-3">
            {templateGuides.map((v) => (
              <MarkdownGuideButton
                key={v.template}
                content={v.content}
                format="markdown"
                label={v.template}
                renderButton={({ onClick, label, disabled }) => (
                  <button
                    type="button"
                    className="template-card"
                    {...guideTarget(`tpl-card-${v.template}`)}
                    onClick={onClick}
                    disabled={disabled}
                  >
                    <span className="template-name">{label}</span>
                    <span className="template-hint">Click to preview</span>
                  </button>
                )}
                onGuideStart={() => pushEvent(`Template → ${v.template}`)}
              />
            ))}
          </div>
        </section>

        {/* ══════════ PLACEMENT ══════════ */}
        <section id="placement" className="section">
          <div className="section-head">
            <h2>Tooltip Placement</h2>
            <span className="badge badge--orange">4 Directions</span>
          </div>

          <div className="placement-demo">
            <div className="placement-anchor" {...guideTarget("placement-anchor")}>
              <h3>Target Card</h3>
              <p>The tooltip will lock to the selected side of this card.</p>
              <div className="placement-indicators">
                <span className="pi pi--top">Top</span>
                <span className="pi pi--right">Right</span>
                <span className="pi pi--bottom">Bottom</span>
                <span className="pi pi--left">Left</span>
              </div>
            </div>
          </div>

          <div className="grid-4">
            {(["top", "right", "bottom", "left"] as const).map((dir) => (
              <MarkdownGuideButton
                key={dir}
                content={placementGuides[dir]}
                format="markdown"
                label={dir}
                renderButton={({ onClick, label, disabled }) => (
                  <button
                    type="button"
                    className="btn-primary btn-placement"
                    {...guideTarget(`placement-btn-${dir}`)}
                    onClick={onClick}
                    disabled={disabled}
                  >
                    {label.charAt(0).toUpperCase() + label.slice(1)}
                  </button>
                )}
                onGuideStart={() => pushEvent(`Placement → ${dir}`)}
              />
            ))}
          </div>
        </section>

        {/* ══════════ HIGHLIGHTS ══════════ */}
        <section id="highlights" className="section">
          <div className="section-head">
            <h2>Highlight Styles & Animations</h2>
            <span className="badge badge--yellow">2 Styles · 4 Animations</span>
          </div>

          <div className="card" {...guideTarget("highlight-preview-box")}>
            <p className="center-text">This card is the highlight target. Pick a combination below.</p>
          </div>

          <div className="grid-4">
            {(["line", "dash"] as const).flatMap((style) =>
              (["none", "color", "dash", "color-dash"] as const).map((anim) => (
                <MarkdownGuideButton
                  key={`${style}-${anim}`}
                  content={buildHighlightGuide(style, anim)}
                  format="markdown"
                  label={`${style} / ${anim}`}
                  renderButton={({ onClick, label, disabled }) => (
                    <button
                      type="button"
                      className={`btn-outline hl-btn hl-btn--${style}`}
                      onClick={onClick}
                      disabled={disabled}
                    >
                      {label}
                    </button>
                  )}
                  onGuideStart={() => pushEvent(`Highlight → ${style} + ${anim}`)}
                />
              ))
            )}
          </div>
        </section>

        {/* ══════════ BEHAVIORS ══════════ */}
        <section id="behaviors" className="section">
          <div className="section-head">
            <h2>Step Behaviors</h2>
            <span className="badge badge--red">Kinds · Advance Modes · Requirements</span>
          </div>

          {/* Step Kinds */}
          <div className="sub-section">
            <h3 className="sub-title">Step Kinds</h3>
            <div className="grid-4">
              {["Action", "Input", "Filter", "Toggle", "Tab", "List", "Map Interaction"].map(
                (kind) => (
                  <MarkdownGuideButton
                    key={kind}
                    content={buildKindGuide(kind, "kind-demo-target")}
                    format="markdown"
                    label={kind}
                    renderButton={({ onClick, label, disabled }) => (
                      <button
                        type="button"
                        className="btn-ghost kind-btn"
                        {...guideTarget("kind-demo-target")}
                        onClick={onClick}
                        disabled={disabled}
                      >
                        {label}
                      </button>
                    )}
                    onGuideStart={() => pushEvent(`Kind → ${kind}`)}
                  />
                )
              )}
            </div>
          </div>

          {/* Advance Modes */}
          <div className="sub-section">
            <h3 className="sub-title">Advance Modes</h3>
            <div className="grid-5">
              <MarkdownGuideButton
                content={buildAdvanceModeGuide("auto", "adv-mode-target")}
                format="markdown"
                label="auto"
                renderButton={({ onClick, label, disabled }) => (
                  <button type="button" className="btn-outline" onClick={onClick} disabled={disabled}>{label}</button>
                )}
                onGuideStart={() => pushEvent("AdvanceOn → auto")}
              />
              <MarkdownGuideButton
                content={buildAdvanceModeGuide("click", "adv-mode-target")}
                format="markdown"
                label="click"
                renderButton={({ onClick, label, disabled }) => (
                  <button type="button" className="btn-outline" onClick={onClick} disabled={disabled}>{label}</button>
                )}
                onGuideStart={() => pushEvent("AdvanceOn → click")}
              />
              <MarkdownGuideButton
                content={buildAdvanceModeGuide("change", "adv-mode-target")}
                format="markdown"
                label="change"
                renderButton={({ onClick, label, disabled }) => (
                  <button type="button" className="btn-outline" onClick={onClick} disabled={disabled}>{label}</button>
                )}
                onGuideStart={() => pushEvent("AdvanceOn → change")}
              />
              <MarkdownGuideButton
                content={buildAdvanceModeGuide("input-idle", "adv-mode-target", "inputIdleMs: 800")}
                format="markdown"
                label="input-idle"
                renderButton={({ onClick, label, disabled }) => (
                  <button type="button" className="btn-outline" onClick={onClick} disabled={disabled}>{label}</button>
                )}
                onGuideStart={() => pushEvent("AdvanceOn → input-idle")}
              />
              <MarkdownGuideButton
                content={buildAdvanceModeGuide("none", "adv-mode-target")}
                format="markdown"
                label="none"
                renderButton={({ onClick, label, disabled }) => (
                  <button type="button" className="btn-outline" onClick={onClick} disabled={disabled}>{label}</button>
                )}
                onGuideStart={() => pushEvent("AdvanceOn → none")}
              />
            </div>
            <div className="card card--compact mt-12" {...guideTarget("adv-mode-target")}>
              <input
                placeholder="Advance mode target (type here for input-idle/change)"
                className="demo-input"
              />
            </div>
          </div>

          {/* Auto-Advance */}
          <div className="sub-section">
            <h3 className="sub-title">Auto-Advance Timer</h3>
            <div className="grid-2" {...guideTarget("auto-advance-box")}>
              <MarkdownGuideButton
                content={buildAutoAdvanceGuide(true)}
                format="markdown"
                label="Visible Timer Bar"
                renderButton={({ onClick, label, disabled }) => (
                  <button type="button" className="btn-primary" onClick={onClick} disabled={disabled}>
                    ⏱ {label}
                  </button>
                )}
                onGuideStart={() => pushEvent("AutoAdvance → visible")}
              />
              <MarkdownGuideButton
                content={buildAutoAdvanceGuide(false)}
                format="markdown"
                label="Hidden Timer Bar"
                renderButton={({ onClick, label, disabled }) => (
                  <button type="button" className="btn-ghost" onClick={onClick} disabled={disabled}>
                    ⏱ {label}
                  </button>
                )}
                onGuideStart={() => pushEvent("AutoAdvance → hidden")}
              />
            </div>
          </div>

          {/* Requirements */}
          <div className="sub-section">
            <h3 className="sub-title">Step Requirements</h3>
            <div className="card">
              <p>Multi-step guide: first requires clicking the button, then requires entering a value.</p>
              <div className="form-row">
                <button
                  type="button"
                  className="btn-primary"
                  {...guideTarget("req-click-btn")}
                  onClick={() => pushEvent("Requirement → click target clicked")}
                >
                  Must Click This
                </button>
                <input
                  className="demo-input"
                  {...guideTarget("req-input-field")}
                  value={reqInput}
                  onChange={(e) => setReqInput(e.target.value)}
                  placeholder="Must type here..."
                />
              </div>
              <div className="form-row mt-12">
                <MarkdownGuideButton
                  content={buildRequirementsGuide()}
                  format="markdown"
                  label="Start Requirements Demo"
                  onGuideStart={() => pushEvent("Requirements → started")}
                  onGuideClose={() => pushEvent("Requirements → closed")}
                />
              </div>
            </div>
          </div>

          {/* Multi-Target */}
          <div className="sub-section">
            <h3 className="sub-title">Multi-Target Spotlight</h3>
            <div className="grid-3">
              <div className="card card--compact center-text" {...guideTarget("multi-target-a")}>
                Target A
              </div>
              <div className="card card--compact center-text" {...guideTarget("multi-target-b")}>
                Target B
              </div>
              <div className="card card--compact center-text" {...guideTarget("multi-target-c")}>
                Target C
              </div>
            </div>
            <div className="form-row mt-12">
              <MarkdownGuideButton
                content={buildMultiTargetGuide()}
                format="markdown"
                label="Highlight All 3 Targets"
                onGuideStart={() => pushEvent("Multi-target → started")}
              />
            </div>
          </div>
        </section>

        {/* ══════════ I18N & THEME ══════════ */}
        <section id="i18n-theme" className="section">
          <div className="section-head">
            <h2>i18n & Theme</h2>
            <span className="badge badge--teal">3 Locales · Custom Themes</span>
          </div>

          <div className="sub-section">
            <h3 className="sub-title">Built-in Locales</h3>
            <div className="grid-3" {...guideTarget("i18n-demo-box")}>
              {(["en", "tr", "da"] as const).map((loc) => (
                <MarkdownGuideButton
                  key={loc}
                  content={buildI18nGuide(loc)}
                  format="markdown"
                  label={loc === "en" ? "🇬🇧 English" : loc === "tr" ? "🇹🇷 Türkçe" : "🇩🇰 Dansk"}
                  renderButton={({ onClick, label, disabled }) => (
                    <button type="button" className="btn-outline locale-btn" onClick={onClick} disabled={disabled}>
                      {label}
                    </button>
                  )}
                  onGuideStart={() => pushEvent(`i18n → ${loc}`)}
                />
              ))}
            </div>
          </div>

          <div className="sub-section">
            <h3 className="sub-title">Custom Themes</h3>
            <div className="grid-3" {...guideTarget("theme-demo-box")}>
              {(Object.entries(THEME_PRESETS) as [string, Record<string, string | number>][]).map(
                ([name, theme]) => (
                  <MarkdownGuideButton
                    key={name}
                    content={buildThemeGuide(name, theme)}
                    format="markdown"
                    label={name}
                    renderButton={({ onClick, label, disabled }) => (
                      <button
                        type="button"
                        className={`theme-card theme-card--${label}`}
                        onClick={onClick}
                        disabled={disabled}
                      >
                        <span className="theme-name">{label}</span>
                        <span className="theme-hint">Click to preview</span>
                      </button>
                    )}
                    onGuideStart={() => pushEvent(`Theme → ${name}`)}
                  />
                )
              )}
            </div>
          </div>
        </section>

        {/* ══════════ VALIDATION ══════════ */}
        <section id="validation" className="section">
          <div className="section-head">
            <h2>Validation & Error Handling</h2>
            <span className="badge badge--red">Safe & Throwing Parsers</span>
          </div>

          <div className="sub-section">
            <h3 className="sub-title">Safe Parse Results</h3>
            <div className="grid-4">
              <div className="card card--compact result-card">
                <h5>parseGuideMarkdownSafe(valid)</h5>
                <span className={`result-badge ${validSafe.guide ? "result-badge--ok" : "result-badge--err"}`}>
                  {validSafe.guide ? "✓ OK" : "✗ null"}
                </span>
                <p>Issues: {validSafe.issues.length}</p>
              </div>
              <div className="card card--compact result-card">
                <h5>parseGuideMarkdownSafe(invalid)</h5>
                <span className={`result-badge ${invalidSafe.guide ? "result-badge--ok" : "result-badge--err"}`}>
                  {invalidSafe.guide ? "✓ OK" : "✗ null"}
                </span>
                <p>Issues: {invalidSafe.issues.length}</p>
              </div>
              <div className="card card--compact result-card">
                <h5>parseGuideContentSafe(json)</h5>
                <span className={`result-badge ${jsonSafe.guide ? "result-badge--ok" : "result-badge--err"}`}>
                  {jsonSafe.guide ? "✓ OK" : "✗ null"}
                </span>
                <p>Issues: {jsonSafe.issues.length}</p>
              </div>
              <div className="card card--compact result-card">
                <h5>parseGuideContentSafe(yaml)</h5>
                <span className={`result-badge ${yamlSafe.guide ? "result-badge--ok" : "result-badge--err"}`}>
                  {yamlSafe.guide ? "✓ OK" : "✗ null"}
                </span>
                <p>Issues: {yamlSafe.issues.length}</p>
              </div>
            </div>
          </div>

          <div className="sub-section">
            <h3 className="sub-title">Throwing Parsers</h3>
            <div className="form-row">
              <button type="button" className="btn-ghost" onClick={runThrowingParse}>
                parseGuideMarkdown (throw)
              </button>
              <button type="button" className="btn-ghost" onClick={runThrowingContentParse}>
                parseGuideContent JSON (throw)
              </button>
            </div>
            {throwResult && <pre className="code-block">{throwResult}</pre>}
            {throwContentResult && <pre className="code-block">{throwContentResult}</pre>}
          </div>

          <div className="sub-section">
            <h3 className="sub-title">Error Modal (onParseError)</h3>
            <div className="form-row">
              <MarkdownGuideButton
                content={invalidGuideMarkdown}
                format="markdown"
                label="Run Invalid Guide (shows error modal)"
                onParseError={(issues) => {
                  setParseIssues(issues);
                  pushEvent(`onParseError → ${issues.length} issue(s)`);
                }}
              />
            </div>
            {parseIssues.length > 0 && (
              <div className="error-box">
                <h5>Latest onParseError issues:</h5>
                <ul>
                  {parseIssues.map((issue, i) => (
                    <li key={`${issue.code}-${i}`}>
                      <strong>[{issue.code}]</strong> line{" "}
                      {typeof issue.line === "number" ? issue.line : "?"} — {issue.message}
                      {issue.hint && <em> ({issue.hint})</em>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="sub-section">
            <h3 className="sub-title">formatGuideIssues()</h3>
            <pre className="code-block">
              {invalidSafe.issues.length > 0
                ? formatGuideIssues(invalidSafe.issues)
                : "No issues to format."}
            </pre>
          </div>
        </section>

        {/* ══════════ EVENTS ══════════ */}
        <section id="events" className="section">
          <div className="section-head">
            <h2>Event Log</h2>
            <span className="badge badge--gray">{eventLog.length} events</span>
          </div>

          {eventLog.length === 0 ? (
            <p className="status-text">No events yet — interact with any feature above to see events here.</p>
          ) : (
            <div className="event-log">
              {eventLog.map((entry, i) => (
                <div key={`${entry}-${i}`} className="event-entry">{entry}</div>
              ))}
            </div>
          )}
          {eventLog.length > 0 && (
            <button type="button" className="btn-ghost mt-12" onClick={() => setEventLog([])}>
              Clear Log
            </button>
          )}
        </section>

        <footer className="footer">
          <p>rotaguide-spotlight · Feature Showcase · All features above are live and interactive.</p>
        </footer>
      </main>
    </div>
  );
}
