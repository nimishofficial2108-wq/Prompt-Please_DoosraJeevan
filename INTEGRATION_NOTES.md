# Integration decisions
- Master UI unchanged on the homepage, service placeholders replaced by iframe wrappers, same navbar persists.
- Modules isolated due independent dependencies and pre-existing framework styles. This avoids rewriting their functionality or merging competing React versions.
- Vite base paths `/modules/neuro/`, `/modules/organ/`; imported absolute static asset links are rewritten to their prefixed locations.
- API proxy prefixes `/api/neuro/*`, `/api/organ/*`, `/api/*` for Reports. Vite reports health and routes are accessible through same origin.
- Module fallback/optional functionality is *not* equivalent to production validation. See README limitations.
