# Regular station timer and release

QR-start visits save the station deadline at admission. Other arrival policies save it when the facilitator confirms the lineup and timing starts. A visit keeps its saved limit even if the station setting changes later. No limit means no automatic timeout. The shared HQ Final Station retains its separate existing flow.

At the deadline, official elapsed time stops at the saved cutoff. The clock clamps locally even offline. Authorized server reads/actions persist the timeout using that same cutoff, so reconnecting late cannot add extra elapsed time. No browser or scheduled background job is needed to determine the official finish. Existing unfinished visits without a snapshot take the current station limit on their first authorized read/action; historical completed outcomes remain unchanged.

Timeout never approves a result. If the lineup is still pending, the timer stops and the facilitator must finish the existing lineup confirmation first. After-limit penalties remain available until the result is confirmed. Early Finish keeps the actual recorded finish. Elapsed time plus penalties may exceed the limit.

For regular timed-race results, **Review station time → Confirm result & release squad** atomically saves the reviewed outcome, ledger and a release deadline five seconds later. Ordinary penalty edits are then locked. Retries preserve the original result and release deadline. During those five seconds, the squad remains at the station and server-side check-in prevents scanning into another station. At the saved release deadline, progress unlocks without another button press. Refresh/reconnect resolves release from server time. Existing points-only and shared Final Station result flows are unchanged.

Migration `20261105070000_station_timeout_release` only adds nullable timing/release columns and an index. It does not delete, reset or rewrite existing scores, lineups, routes or results. Station duration settings, capacity, queue settings, pause behavior, score formula and result visibility are not changed.

Validation: `tests/station-timing.test.ts`, `node tests/station-timing-integration.mjs`, and `STATION_TIMING_BROWSER_ONLY=1 node tests/theme-smoke.mjs`, plus the existing full integration suite.
