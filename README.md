# SOV Creative Marketplace

Public website plus artist accounts (sign up, application, dashboard) and the team review page.

- Static site hosted on GitHub Pages.
- Accounts, data and private artwork photos live in the Supabase project `sov-creative-marketplace`.
- `account/config.js` holds the public Supabase URL and publishable key. Data is protected by row-level security (see `supabase-schema.sql`).
