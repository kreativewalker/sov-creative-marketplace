# SOV Creative Marketplace

Public website, business briefs, creative accounts (sign up, application, dashboard) and the team review page.

- Static site hosted on GitHub Pages.
- Pages: `index.html` (home), `spaces.html`, `how-it-works.html`, `creatives.html`, `about.html`, `brief.html` (business brief form). Shared styles and scripts are in `assets/`.
- Accounts, briefs and private work samples live in the Supabase project `sov-creative-marketplace`. Business briefs and creative applications are reviewed at `account/team.html` (team members only).
- `account/config.js` holds the public Supabase URL and publishable key. Data is protected by row-level security (see `supabase-schema.sql`).
- Photos are AI-generated illustrations served through an image resizer. Swap them for real project photos when you have them.
- The `*.dc.html` files are earlier prototype screens. The old main pages redirect to the new ones.
