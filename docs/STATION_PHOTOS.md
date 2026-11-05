# Station location photos

Organizers open **Station files → a station → Location photo** to upload, preview, replace or remove one photo. Uploads remain available during the event; archived events are read-only. Accepts JPG, PNG and WebP, up to 5 MB / 24 megapixels. The server strips metadata and converts to WebP with the longest edge at most 1280px, preserving the full photo and aspect ratio.

Participants see the photo beneath their current destination and in the station details. A link opens the full image. Facilitators have a collapsed Location photo disclosure beside their assigned station's location. Stations without a photo keep their existing text location.

Images use built-in `StationPhoto` storage. Every read checks active individual identity, event membership and role access. Participant access also checks the assigned route and station visibility; hidden station details cannot be bypassed through the image URL. Facilitators can read photos for assigned stations. Only organizers can write; changes are audited, version checked and atomic. Replacement/removal deletes the previous stored image. Images are served privately without caching.

Apply migration `20261105050000_station_photos` before deploying. No external storage setup is required. Station results, timers, routes and scoring are unaffected.
