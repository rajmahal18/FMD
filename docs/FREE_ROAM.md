# Unrestricted free roaming

While Preparing, create a Free roam route with the required stations. Open Routes ? Team routes ? All teams, select it, and choose **Enable free roaming for all teams**. This atomically replaces every team assignment with the current route snapshot and clears required first stations. The review/confirmation, stale setup token, organizer scope, audit and no-existing-visits checks remain enforced. Fixed/circular routes and optional randomized first stations remain available.

Participants choose any remaining station. Stations shows Available/Occupied/Full/Paused/Completed, occupying team names, occupied-since time and queue counts. Admission audit timestamps supply occupied-since; legacy visits fall back to the challenge start, or omit the time when no reliable timestamp exists. No private facilitator notes or individual identities are included. Polling stays every ten seconds and capacity is rechecked atomically at actual arrival. Viewing does not reserve a station. Existing assignments are not silently changed on deployment.

No schema migration is required. Verified with unit tests, real HTTP integration checks for unrestricted first arrival and occupancy, and responsive browser checks for setup and participant station choice.
