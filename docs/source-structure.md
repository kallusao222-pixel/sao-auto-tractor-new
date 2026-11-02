# Source tree guide

## Runtime entry points

- `index.html` — the single Vite HTML document.
- `src/main.jsx` — React bootstrap, global styles and PWA service worker registration.
- `src/App.jsx` / `src/App.css` — navigation, app shell and page composition.

## Source folders

- `src/pages/<feature>/` — routed screen component (`.jsx`) and its screen stylesheet (`.css`). Existing route folder names retain their established casing so imports and current user changes remain intact.
- `src/components/ui/` — reusable controls and paired component styles.
- `src/components/layout/` — reserved for active layout component/style pairs; the current app shell is composed in `src/App.jsx`.
- `src/context/` — shared React state providers.
- `src/data/` — local storage keys, defaults, initialization and data events.
- `src/hooks/` — reusable React hooks.
- `src/styles/` — global design tokens and base styles.
- `src/utils/` — framework-independent helpers.
- `src/assets/`, `src/icons/` — imported static assets and icon components.
- `public/` — static files copied as-is, including app icons and the business logo.
- `docs/` — project plans and documentation.

## File types used

- `.html`: one app entry document at the repository root.
- `.jsx`: React screens and components.
- `.js`: non-visual logic, app configuration and helper modules.
- `.css`: global, feature and component styles.
- Image/vector files: static or imported visual assets.
- `.json`: package manifests, app settings/configuration and data fixtures where needed.

Create a file only when a feature needs it. Keep a feature's `.jsx` and `.css` together when both exist; do not add empty placeholder files for unused formats.

## Archived source

`src/pages/_archive/` contains unused empty page stubs and a superseded Daily Report backup. `src/components/_archive/` contains the unused alternate shell. These files are retained for recovery/reference and are not runtime routes or imports.

The active Party Details implementation is currently absent from the working tree; its previously deleted files were not restored or replaced as part of this structural cleanup.
