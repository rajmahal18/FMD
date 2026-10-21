# List layouts

Stations, route planning, facilitator assignments, activity configuration/results and voting events use the shared `RecordTabs` workspace. One record panel is visible at a time. Routes separate templates from team assignments; staffing separates station coverage from individual facilitators. Creation forms have their own tabs. All existing server permissions and management actions remain in place; archived events do not expose setup editing.

Tabs retain mounted form components, so switching records or searching does not discard unsaved fields or ballot choices. Lists longer than five records include name search. New records select automatically, removed selections fall back to an available record, and no-match searches show a readable empty state. Renaming an activity does not hide its form mid-edit. Arrow keys, Home and End move between tabs, with associated tab panels and one active keyboard tab stop. Only the navigation strip scrolls horizontally on mobile.

Overall standings retain a comparable compact team list, with contribution details folded per team. Audit entries, saved result revisions, facilitator history, contact counts/review and voting result lists have contained vertical scrolling with keyboard-focusable regions. Active station work, queues and the existing Mission Control filters remain immediately accessible.

No schema changes. Browser coverage in `LISTS_BROWSER_ONLY=1 node tests/theme-smoke.mjs` uses seven stations/facilitators, three routes, three voting events and the 93-person roster. It checks 320/390/768/1440px layouts, one visible record, search/empty states, unsaved-edit retention, actual station/assignment/staffing/activity saves and cross-team assignment isolation. Build, unit and authenticated integration checks also pass.
