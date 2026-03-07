---
id: full-feature-showcase
title: RotaGuide Spotlight Full Feature Walkthrough
buttonLabel: Start Full Feature Guide
tooltipTemplate: contrast
tooltipTitle: You completed all feature steps
overlayColor: "rgba(0, 43, 69, 0.22)"
highlightColor: "rgb(255, 199, 0)"
highlightStyle: line
highlightAnimation: none
tooltipWidth: 420
showHighlight: true
draggable: true
i18n:
  locale: en
  stepProgressLabel: "Phase {current}/{total}"
  autoAdvanceMessage: "Continuing in {seconds}s"
theme:
  fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif"
  tooltipBorderColor: "#d5e5ef"
  primaryButtonBackgroundColor: "#0f766e"
  primaryButtonHoverBackgroundColor: "#0b5f59"
---

## Step: Manual Step Mode
```yaml
id: manual-intro
target: guide-start-panel
kind: Action
tooltipTemplate: default
title: Manual progression with Next button
description: This step uses advanceOn:none, so you move forward using the tooltip Next action.
advanceOn: none
skippable: false
```

## Step: Required Click
```yaml
id: open-create
target: open-create
kind: Action
tooltipTemplate: glass
title: mustClickTarget enforcement
description: Click Open Booking Form. Clicking outside the target does not advance.
advanceOn: click
highlightColor: "#f7c600"
mustClickTarget: true
skippable: false
```

## Step: Input Idle + Value Requirement
```yaml
id: customer-name
target: customer-name
kind: Input
tooltipTemplate: minimal
title: input-idle + mustEnterValue
description: Type a non-empty customer name, then pause briefly to auto-advance.
highlightColor: "#22c55e"
advanceOn: input-idle
inputIdleMs: 900
mustEnterValue: true
skippable: false
```

## Step: Change Mode On Select
```yaml
id: plan-select
target: plan-select
kind: Filter
tooltipTemplate: contrast
title: change mode with select input
description: Pick a plan to continue using change events.
advanceOn: change
mustEnterValue: true
skippable: false
```

## Step: Skippable Alias
```yaml
id: notify-toggle
target: notify-toggle
kind: Toggle
tooltipTemplate: dashboard-orange
title: skippable step using allowSkip alias
description: Check the email confirmation option or use Skip.
advanceOn: change
mustEnterValue: true
allowSkip: true
```

## Step: List Kind + Alias Normalization
```yaml
id: manual-note
target: manual-note
kind: List
tooltipTemplate: clean-white
title: List kind with normalized aliases
description: "This step demonstrates `kind: List` plus alias normalization for highlight fields."
advanceOn: none
highlightStyle: solid
highlightAnimation: off
skippable: true
```

## Step: Timed Auto Advance (Visible)
```yaml
id: auto-progress-step
target: auto-progress-step
kind: Action
tooltipTemplate: commerce-dark
title: autoAdvanceMs with progress bar
description: This step auto-advances after a timer and shows progress loading.
advanceOn: none
highlightStyle: dash
highlightAnimation: dash
autoAdvanceMs: 5000
showAutoAdvanceProgress: true
```

## Step: Timed Auto Advance (Hidden)
```yaml
id: auto-hidden-progress-step
target: auto-hidden-progress-step
kind: Action
tooltipTemplate: terminal-pop
title: durationMs + showTimerLoading alias
description: Uses alias fields and advances automatically without visible timer bar.
advanceOn: none
durationMs: 2500
highlightAnimation: dash-move
showTimerLoading: false
```

## Step: Explicit List Kind
```yml
id: list-kind-step
target: list-kind-step
kind: List
tooltipTemplate: outline-light
title: Explicit List kind target
description: Additional List kind step for kind coverage in the example.
advanceOn: none
backButtonLabel: "Back (Step)"
nextButtonLabel: "Continue"
theme:
  ghostButtonBackgroundColor: "#f3f4f6"
  ghostButtonTextColor: "#111827"
highlightStyle: dashed
skippable: true
```

## Step: Map Interaction Kind + timeoutMs
```json
{
	"id": "map-kind-step",
	"target": "map-kind-step",
	"kind": "Map Interaction",
	"tooltipVariant": "standard",
	"title": "Map Interaction kind with timeoutMs alias",
	"description": "Demonstrates kind coverage with timeoutMs and showTimerLoading alias.",
	"advanceOn": "none",
	"timeoutMs": 1800,
	"showTimerLoading": true,
	"highlightAnimation": "color-dash-move",
	"skippable": true
}
```

## Step: Highlight Disabled Per Step
```yaml
id: highlight-off-note
target: highlight-off-note
kind: Tab
tooltipVariant: dark
title: showHighlight false at step level
description: The guide continues without drawing yellow highlight for this step.
showHighlight: false
draggable: false
advanceOn: none
skippable: true
```

## Step: Missing Target Warning
```yaml
id: missing-target-step
target: "#missing-target-for-demo"
kind: Action
template: terminal
title: Target-not-found warning behavior
description: This step intentionally uses a missing selector so you can see the warning hint in tooltip.
advanceOn: none
skippable: true
```

## Step: Full CSS Selector Target
```yaml
id: save-booking
target: "#save-booking-btn"
kind: Action
tooltipVariant: ecommerce
title: Full selector target + strict click
description: Final step uses a raw CSS selector instead of shorthand target id.
highlightColor: "#0ea5e9"
highlightStyle: dash
highlightAnimation: dash-color
mustClickTarget: true
skippable: false
```
