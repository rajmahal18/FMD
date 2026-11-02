# Spy Chase visual hierarchy

The shared finishing layer is `src/app/spy-theme.css`, imported after the existing feature styles. It covers login, organizer workspaces, participants and facilitators without changing their routes, permissions or event behavior.

- Current task: cyan left rule, clear destination and one prominent action.
- Sections: full-width navy bands, strong heading separators and whitespace, avoiding nested card stacks.
- State: mint for confirmed/ready, amber for waiting and penalties, red for blocked/destructive actions. Labels remain visible alongside color.
- Navigation: icon-and-label tabs with a high-contrast selected state; mobile navigation tabs can scroll horizontally while page content wraps.
- Reading/forms: paper surfaces retain dark text, and QR modules stay black on white.

`SpyAtmosphere` provides a fixed, pointer-transparent decorative layer behind the interface. Cracked-glass strokes, small impact rings and two tracer streaks animate once on pathname changes, then settle within one second. There is no sound, repetitive flashing, synthetic live telemetry or animation tied to score confirmation. SVG/CSS assets add no image downloads or animation library. Reduced motion removes these animations and tracers, while printing hides the entire effect layer.

Mobile layouts reserve safe space above the existing participant/facilitator dock. Dialogs retain scrolling and device safe-area padding. Focus outlines use amber on dark surfaces.

Run the focused browser validation with `SPY_THEME_BROWSER_ONLY=1 npm run test:theme` (set the variable using your shell's syntax). It uses an isolated database and checks 320/390/768/1440px, contrast, blocked controls, bottom-nav spacing and reduced motion. Screenshots and the checks report are written to `.tmp/stability-evidence/`.
