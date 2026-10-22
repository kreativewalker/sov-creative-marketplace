# SOV design contract

One system for every public page. Change it here first, then in assets/site.css.

## Color
- Ground: aubergine `#24091F` (alternate `#2B0C26`, deep `#1A0616`)
- Ink: `#F3EEE4`, secondary `#DDD2C6`, muted `#B5A99D`
- Accent: antique brass `#B59E5A`, light `#D9C68E` (actions and one field of colour per page)
- Signature: the five logo dots, which stand for the feedback words See `#E9B23A`, Hear `#D9622B`, Feel `#9E2338`, Think `#5E3F94`, Experience `#2F7A55`

## Type
- Display: Instrument Serif, regular weight only (brand face, shared with the pitch deck)
- Text: Schibsted Grotesk, 16 to 21px
- Headlines stay within two lines at every width. No accent words, no all-caps labels, no eyebrows.

## Layout
- One wrap with equal side margins. Sections alternate ground tones; section padding scales with content (`.lx-sec`, `.big`, `.tight`).
- No hairline dividers or outlined boxes, except inside real tables. Separation comes from space and tone steps.
- One dominant photograph per section, square corners. Real photographs of SOV work only.
- One field of brass colour per page (`.lx-field`).
- Buttons are pills, one fill (brass), labelled with what they do ("Start a project", "Apply to the Registry").

## Components
`.lx-hero`, `.lx-open` + `.lx-open-grid`, `.lx-two`, `.lx-split`, `.lx-list`, `.lx-cols` (+ `.panels`), `.lx-nums`, `.lx-table`, `.lx-faq`, `.lx-five`, `.lx-calc`, `.lx-field`, `.lx-end`.

## Immersive layer
`assets/immerse.css` and `assets/immerse.js`: pigment shader in the first section, film grain, canvas texture, a gallery light that follows the cursor, headline word reveals, scroll reveals, parallax and tilt on pictures, count-ups, painted edges on the brass field, the five feedback words lighting in their colours. Everything stops under reduced motion.

## Still on the older system
Sector pages (hotels, destinations, developers, healthcare, public agencies, workplaces), brief, contact and the signed-in account pages.
