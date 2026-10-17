# User-requested UI changes — Final

| Requirement | Implementation |
| --- | --- |
| Two services on home | `src/config/services.js` lists only NeuroScan / Organ Donation |
| No report button in nav / home | Removed from service listing |
| Larger centered service tiles | Final CSS rules in `src/styles.css` |
| Poppins general UI | Google Fonts loaded on all three entry pages; typography CSS |
| Roboto numerical fields | Numeric-specific styles throughout apps |
| Remove blue educational banners | No `module-notice` screen used (full-page navigation); no NeuroScan education text; organ duplicate info banner suppressed |
| Full-page integration | Homepage links directly to proxied `/modules/neuro/` and `/modules/organ/`, **not iframe** |
| Same site nav throughout | `dj-global-nav` inside both module apps, matching homepage branding / links |
| Remove Hindi feature labels | Static organ HTML text stripped/English titles displayed; dynamic labels may still come from its legacy JS data, with font and layout overrides |
| Remove reset/sync/network ticker/ledger metadata | Hidden in Organ Donation shell CSS; original business/demo logic not deleted |

## Important note
This changes the **presentation and navigation**, preserving the two original project engines. It does not establish a real blockchain, doctor verification, diagnostic clearance, or official donor registration. Uploaded patient data should be synthetic only.
