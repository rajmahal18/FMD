# Error notices

Error notices use the shared `ErrorNotice` component and the root `ErrorModalProvider`. Login/password errors, management forms, race actions, scanning, connection errors, voting, lifecycle, results and overall-ranking failures open a native modal dialog. Success messages remain inline. Browser field validation remains beside the relevant field.

The modal receives focus, makes background controls inert, supports Escape and Close, restores form focus, and fits mobile screens with scrollable long messages. Multiple sources queue instead of opening stacked dialogs. An unchanged polling error does not reopen after dismissal; a new failed attempt can display the same error again. Form state, pending request bodies and idempotency keys are preserved. Errors disappear from the queue when their source unmounts or recovers. A noscript fallback retains the error text when JavaScript is unavailable.

Overall ranking now separates failed saves from successful status messages. No schema, authorization or server mutation behavior changes.

Validation: production build, 50 unit tests, authenticated integration suite, and `ERROR_BROWSER_ONLY=1 node tests/theme-smoke.mjs`. Browser checks cover server-rendered login errors, actual failed/successful management submissions, repeated errors, focus trapping/restoration, Escape/Close, input retention and 320/390/768/1440px sizing.
