## ADDED Requirements

### Requirement: Theme toggle lives in the shared site footer

The design system SHALL provide a theme-toggle control rendered inside `SiteFooter.astro` (both `rich` and `minimal` variants), so any consumer site that adopts `SiteFooter` gets the toggle by default. The toggle SHALL be opt-out via a prop, not opt-in.

#### Scenario: Site renders the minimal footer

- **WHEN** a site renders `<SiteFooter variant="minimal" />` with no theme-toggle props supplied
- **THEN** the footer SHALL include a visible, focusable button that toggles between light and dark themes

#### Scenario: Site explicitly opts out

- **WHEN** a site renders `<SiteFooter themeToggle={false} ... />`
- **THEN** the footer SHALL NOT render the theme-toggle button (used by `talks` and any context where theme switching is inappropriate)

### Requirement: Toggle reflects current theme and announces target state

The toggle button SHALL show an icon and accessible label that match the user's **current** theme while announcing the **action** that will happen on activation, so screen-reader users understand the affordance.

#### Scenario: Current theme is dark

- **WHEN** the user is currently viewing the dark theme (no `data-theme` attribute or `data-theme="dark"`)
- **THEN** the button SHALL render a sun icon and an `aria-label` of `"Activar modo claro"` (Spanish, matching site copy)

#### Scenario: Current theme is light

- **WHEN** the user is currently viewing the light theme (`data-theme="light"`)
- **THEN** the button SHALL render a moon icon and an `aria-label` of `"Activar modo oscuro"`

### Requirement: Toggle activation flips the theme and persists the choice

Activating the toggle (mouse click, touch, Enter, or Space) SHALL synchronously flip the theme on the current page and persist the new choice for future visits to the same origin.

#### Scenario: User clicks toggle while in dark mode

- **WHEN** the user activates the toggle and the current theme is dark
- **THEN** `document.documentElement.dataset.theme` SHALL become `"light"`, `localStorage["chimi-theme"]` SHALL become `"light"`, and the visible page SHALL repaint with light-theme colors before the next animation frame

#### Scenario: User clicks toggle while in light mode

- **WHEN** the user activates the toggle and the current theme is light
- **THEN** `document.documentElement.dataset.theme` SHALL become `"dark"` (or be removed) and `localStorage["chimi-theme"]` SHALL become `"dark"`

#### Scenario: User returns on a later visit

- **WHEN** the user previously chose light, closes the tab, and reopens any site on the same origin
- **THEN** the page SHALL render in light from the very first paint (no flash of dark content)

### Requirement: First-paint bootstrap script prevents FOUC

The design system SHALL provide a small inline bootstrap script that reads `localStorage["chimi-theme"]` and sets `document.documentElement.dataset.theme` synchronously, before any stylesheet paints. Consumer sites SHALL embed this script in `<head>` ahead of any other script and ahead of any `<link rel="stylesheet">` whose styles depend on the theme.

#### Scenario: Saved choice is light, page first loads

- **WHEN** `localStorage["chimi-theme"]` is `"light"` and a fresh page load begins
- **THEN** by the time the first frame paints, `<html data-theme="light">` SHALL be present and the user SHALL see light colors immediately, with no visible flicker of dark content

#### Scenario: No saved choice, JavaScript disabled

- **WHEN** the user has JavaScript disabled and visits with no saved choice
- **THEN** the page SHALL render in dark (the default), and the toggle button SHALL either be hidden or display a `<noscript>` fallback message indicating that JavaScript is required to switch themes

#### Scenario: Saved choice is invalid

- **WHEN** `localStorage["chimi-theme"]` contains a value other than `"light"` or `"dark"` (e.g., due to manual tampering)
- **THEN** the bootstrap SHALL ignore the value, fall back to dark, and SHOULD overwrite the bad value with `"dark"` to self-heal

### Requirement: Toggle dispatches a `themechange` event

When the theme changes (via toggle activation or programmatically via the bootstrap), the toggle SHALL dispatch a `CustomEvent` named `themechange` on `window` with `detail: { theme: "light" | "dark" }`. This lets analytics and other islands react without coupling to the toggle implementation.

#### Scenario: Analytics island listens for theme changes

- **WHEN** an analytics island registers `window.addEventListener("themechange", handler)` and the user activates the toggle
- **THEN** the handler SHALL be called once per activation with `event.detail.theme` set to the new theme value

### Requirement: Toggle is keyboard-accessible

The toggle button SHALL be a native `<button>` element (not a styled `<div>`), reachable via Tab key, activatable with Enter or Space, and SHALL show a visible focus ring matching the rest of the site's focus styling.

#### Scenario: Keyboard user navigates to the toggle

- **WHEN** a keyboard-only user tabs through the footer
- **THEN** the toggle SHALL receive focus in document order, display a visible focus indicator, and respond to Enter and Space by activating
