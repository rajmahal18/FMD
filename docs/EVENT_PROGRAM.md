# Event Program

`/events/[eventId]/program` shows the event's published agenda to active event members. The mission page links to it below team details; participants can also open it from Account, and staff have an Event Program navigation link.

The agenda uses accessible day tabs and expandable activity rows. The initial tab follows the event timezone on a scheduled day and otherwise opens the first day. Main gala programming ends at 8:30 PM; afterglow runs until 10:00 PM. The page does not start races, open voting, or alter any operational controls.

Program content is stored per event in `EventProgram.content`. Events without content show an honest unpublished state. The supplied FMD master schedule lives in `prisma/operation-program.ts`; after deploying migrations, run `node --import tsx scripts/configure-operation-program.ts` to save it to `operation-classified-fmd`. The command preserves race data, is safe to repeat, and audits content changes. Other events are untouched. There is no schedule editor in this version.

Validation covers ordered dates, valid time ranges, duplicate item identities, and overlapping activities. Integration checks cover event access and isolation. Browser checks cover tabs, expanded details, Account navigation, and mobile overflow with the existing bottom dock.
