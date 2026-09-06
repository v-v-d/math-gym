# FEATURE-001 — Математический тренажер

Standalone Vite + TypeScript SPA implementing the approved FEATURE-001 artifacts.

## Run

```bash
npm ci
npm run dev
```

## Verify

```bash
npm run verify
```

`verify` regenerates the immutable 10,502-problem catalog, checks cardinalities, typechecks, runs unit tests and builds with analytics disabled.

## Production analytics policy

Production publication is intentionally fail-closed. Copy `config/analytics-policy.example.json` to `config/analytics-policy.json` and replace placeholders with the accountable deployment decision. Supported modes: `approved-basis`, `consent-gated`, `disabled`.

For an explicitly governed production build:

```bash
REQUIRE_ANALYTICS_POLICY=1 npm run build
```

The app itself stores no session/history data. Trainer state is memory-only and resets on reload.

## CSP

Vite dev/preview configure the architecture-approved CSP. The production hosting platform must deliver the equivalent HTTP header.
