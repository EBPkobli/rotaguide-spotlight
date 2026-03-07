---
id: create-booking-guide
title: Create Booking Walkthrough
buttonLabel: Start Create Guide
tooltipTemplate: glass
showHighlight: true
draggable: true
i18n:
  locale: en
  stepProgressLabel: "Step {current}/{total}"
  autoAdvanceMessage: "Auto advancing in {seconds}s"
theme:
  fontFamily: "'Segoe UI', 'Inter', sans-serif"
  tooltipBackgroundColor: "#ffffff"
  tooltipBorderColor: "#d9e6ef"
  titleColor: "#0b2540"
  descriptionColor: "#4d5e6b"
  primaryButtonBackgroundColor: "#1a63f5"
  primaryButtonHoverBackgroundColor: "#1554d2"
---

## Step: Open Drawer
```yaml
id: open-create
target: open-create
kind: Action
title: Open booking drawer
description: Click New Booking to open the drawer.
skippable: false
mustClickTarget: true
```

## Step: Fill Customer Name
```yaml
id: customer-name
target: customer-name
kind: Input
title: Fill customer name
description: Type the customer name field.
mustEnterValue: true
inputIdleMs: 1500
i18n:
  requireInputMessage: "Please enter a customer name for this step."
```

## Step: Save Booking
```yaml
id: save-booking
target: save-booking
kind: Action
title: Save booking
description: Click Save Booking to finish.
skippable: false
mustClickTarget: true
autoAdvanceMs: 7000
showAutoAdvanceProgress: true
theme:
  timerFillColor: "#0ea5e9"
```
