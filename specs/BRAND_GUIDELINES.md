# Brand Guidelines

Personal Wealth Management Web App
Version 1.0

## 1) Brand intent

This product is a personal wealth management tool that must feel:

* Calm
* Precise
* Trustworthy
* Minimal
* Modern
* Financially serious

The UI should be clinically clean, similar to OpenAI and Revolut: high clarity, soft geometry, sparse accents, and predictable structure.

## 2) Design pillars

### 2.1 Clarity over decoration

Every element must improve understanding or reduce effort. If it does not, remove it.

### 2.2 Calm confidence

The UI should feel stable and controlled. Avoid visual noise, “exciting” styling, and unnecessary motion.

### 2.3 Data first, always explainable

Numbers are the hero. Every key output must be traceable to inputs with an audit trail (expandable calculation steps).

### 2.4 Soft geometry

Rounded corners everywhere. Charts and containers should look smooth and premium, never sharp.

### 2.5 Consistent interaction patterns

Users must learn the interface once and reuse the same mental model everywhere: snapshot first, drill-down second.

## 3) Visual identity

### 3.1 Color system

Use a neutral base and a single calm accent.

Base:

* Background: #FFFFFF
* Surface: #F7F7F8
* Elevated surface: #FFFFFF
* Divider / border: #E5E7EB

Text:

* Primary: #111827
* Secondary: #6B7280
* Muted: #9CA3AF

Accent:

* Primary accent (fintech blue): #2563EB
* Positive: #16A34A
* Negative: #DC2626
* Warning (rare): #F59E0B

Rules:

* No gradients.
* No neon colors.
* Accent color is used sparingly for primary actions, focus states, and one highlighted data series at a time.
* Never use more than one strong color per screen.

### 3.2 Typography

Typography must be modern, neutral, and number-friendly.

Recommended fonts:

* Inter (preferred)
* SF Pro
* Geist

Rules:

* Use tabular numerals for financial values when possible.
* Avoid heavy bold. Use weight for hierarchy, not decoration.
* Keep headings short and functional.

Type scale (guideline):

* Display (hero metric): 32–40px, medium
* H1: 24–28px, medium
* H2: 18–20px, medium
* Body: 14–16px, regular
* Caption: 12–13px, regular

### 3.3 Spacing and layout

Use an 8px spacing system. Prefer generous whitespace.

Spacing scale:

* 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64

Layout rules:

* Use a clear grid.
* Align metrics and labels consistently.
* Avoid dense dashboards. Prioritize readability and scanning.

### 3.4 Corner radius and shadows

Soft geometry is mandatory.

Corner radius:

* Buttons: 10–12px
* Inputs: 10–12px
* Cards: 14–16px
* Modals / sheets: 16–20px
* Chart containers: 14–16px

Shadows:

* Use subtle shadows only.
* Never use harsh drop shadows or high blur glow effects.

## 4) Iconography

Icons must be real icons, not emojis.

Style:

* Minimal, geometric, thin stroke
* Consistent stroke width
* Neutral by default

Rules:

* No emojis anywhere in the UI.
* Icons are functional, not decorative.
* Use icons primarily for actions and navigation: add, edit, delete, filter, download, info, settings.

Recommended icon sets:

* Lucide
* Heroicons
* Phosphor (thin style)

## 5) Charts and data visualization

Charts must feel soft, calm, and premium.

Rules:

* Smooth lines (no sharp joints).
* Minimal gridlines.
* Rounded chart containers.
* No heavy outlines.
* Highlight only one series at a time.
* Use muted tones for secondary series.
* Keep axes minimal and readable.
* Provide units and time scale clearly.

Default chart types:

* Net worth over time (line)
* Portfolio value over time (line)
* Tax payable over time (line)
* Allocation (donut or stacked bar)

Chart accessibility:

* Do not rely solely on color to communicate meaning.
* Include labels or tooltips for key points.

## 6) Components and UI patterns

### 6.1 Snapshot cards (standard pattern)

Each module must start with standardized snapshot cards.

A snapshot card includes:

* One primary metric (large number)
* One supporting label (small, muted)
* Optional delta (subtle, never loud)

Rules:

* Keep card content minimal.
* Avoid multiple badges or extra widgets inside the card.

### 6.2 Tables (financial readability)

Rules:

* Right-align numeric values.
* Use subtle row dividers.
* Keep column headers short.
* Allow drill-down by row expansion, not by adding columns.

### 6.3 Inputs

Rules:

* Clear units (DKK, %, per month).
* Clean validations (neutral, not alarming).
* Use defaults that are safe and explainable.
* Avoid cluttered forms. Break into sections.

### 6.4 Panels over modals

Prefer side sheets and inline expansions over modal dialogs.

### 6.5 Explainability (audit trail)

Every screen that displays derived numbers must have:

* “Calculation steps” section
* Default collapsed
* Clear inputs and intermediate steps

## 7) Motion and interactions

Motion must communicate state, not entertain.

Rules:

* Subtle easing and transitions only.
* Avoid bouncy effects.
* Keep durations short and consistent.

Examples:

* Hover: soft background shift
* Loading: minimal skeleton or spinner
* Chart transitions: smooth but not flashy

## 8) Copy and tone

Tone must be neutral, precise, and finance-appropriate.

Rules:

* No hype language.
* No exclamation points.
* No emojis.
* Use short and functional labels.
* Always include units.

Good examples:

* “Projected tax payable (DKK)”
* “Calculation steps”
* “Assumptions”
* “Monthly plan execution day”

Avoid:

* “Awesome!”
* “Congrats!”
* “Let’s go!”

## 9) Logo and branding usage

Logo usage must be minimal and premium.

Rules:

* Place the logo in the top-left in the main shell.
* Keep it monochrome or subtle (no flashy gradients).
* Do not use large hero logos inside functional screens.

Favicon and app icon:

* Simple mark, high contrast, minimal geometry.
* No text in icon.
* Works in 16px.

## 10) Navigation structure (UX rule)

The app must feel predictable. Navigation should be stable and minimal.

Recommended primary modules:

* Overview
* Investments
* Debt
* Tax
* Simulations
* Settings

Rules:

* No more than 6 primary navigation items.
* Use consistent page templates across modules.

## 11) Accessibility baseline

* Minimum text contrast must be sufficient for readability.
* Focus states must be visible but calm (accent outline or subtle glow).
* Keyboard navigation must work for key flows (forms, tables, side sheets).

## 12) Brand enforcement checklist (non negotiable)

A screen passes the brand standard only if:

1. It starts with a snapshot or clear headline metric.
2. It uses neutral base colors and sparse accent.
3. It has consistent spacing and soft corners.
4. It uses icons (no emojis).
5. It is explainable: key numbers have calculation steps available.
6. It avoids clutter: only essential elements are present.

End of file.
