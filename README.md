# Antz Diet Module

Phone and iPad prototype of the Antz **Diet** module and the **Help Desk** diet requests, opened from the Antz Home (Modules › Diet, Modules › Help Desk).

**Live:** https://antz-diet-module.pages.dev

- **Diet:** browse diets by species (first) or by diet. Nothing sits above the Species wise | Diet wise tabs; requests live in Help Desk. A species opens with a dark header as the Antz app's species page (name, scientific name, Population · Sites · Sections · Enclosures). Cards show no animal count. Diet Details has a **PDF** icon that opens the diet as Kitchen & Diet's diet PDF, full screen (tap the page to zoom). Diet Details › Applied to lists the species (photo, name, scientific name) with the places under each; History also shows every request raised on the diet (open ones as steps to come).
- **Diet (more):** A species shows its diets at every level (species, site, section, enclosure, animal). A diet shows its details, certifications, notes, nutrition and its own change history. The app only views diets; editing stays on the web.
- **Help Desk:** list, raise and approve requests. The list has four tabs that fit the width: **Pending · Approved · Closed · All** (Closed = Rejected, Canceled, Deleted, as chips under it).
- **Diet requests, two kinds** (New Request › Requesting to Diet › Request):
  - **Diet request**, in words for the kitchen: Skip a feed · Extra feed · Medicine with food · Food quality · Something else. Each asks only the day and feed, then the request's own words.
  - **Diet change**, the diet's configuration: Change item values (Food | Was | Now) · Another diet · New diet (start from a diet and set its foods, or ask the dietician to build one) · End a diet early.
  - **Anybody** can raise either. The **Dietician** approves. **Approving applies it**: a Diet change (and a skipped feed) goes into the diet at once and writes the diet history; the kitchen works from the diet as it now is. There is no separate kitchen step.
- **For** (who it is for) follows Kitchen & Diet's species and scope pickers: search a species, then Species-wide · Site-wide · Section-wide · Enclosure-wide · Animal-wide, each with how many diets are set there.
- **After approval, other departments** (as the Antz app's Help Desk): the department's team moves a request to **In progress**, can set a **Job in charge**, then moves it to **Completed** with completion notes, team size, people involved and attachments. A completed request can be moved back to In progress, with a reason. The Approved tab has the chips All · Approved · In progress · Completed.
- **The diet shows its requests:** Diet Details › Overview shows a request on the way (Requested; an approved change that starts later; an approved request in words for the kitchen). Once approved, an **Updated** card says what changed and who approved it, and the changed lines stay marked for 7 days. The request links to the diet as it is now.
- **Layouts:** the phone drills in one screen at a time with bottom sheets. The iPad (portrait and landscape) uses a split view.
- **Sheets** follow the Antz design system: a sheet is for a short choice or a few facts, never opens another sheet, and is never a place Back returns to. Leaving a sheet for a page closes it for good. A record's extra actions sit in a menu under ⋮.

This is a front-end prototype. It has no backend and no login, and it runs on demo data.

## Run locally

There is no build step. Serve the folder over HTTP, because the Home build loads JSON and `file://` will not work.

```bash
python3 -m http.server 8766 --bind 127.0.0.1
```

Open http://127.0.0.1:8766/

### URL options

| Option | Values | Effect |
|---|---|---|
| `?f=` | `phone` · `portrait` · `landscape` | Device frame |
| `?as=` | `kiran` · `hydar` · `suresh` · `manoj` | Person you view as |
| `?fill` | | Fill the window with no frame (a real phone or iPad fills on its own) |

Example: http://127.0.0.1:8766/?f=landscape&as=suresh

The controls above the device frame (Frame · Viewing as · Home · Reset demo data · Copy to Figma) are prototype tools, not part of the app. **Copy to Figma** loads Figma's capture script (mcp.figma.com) on first use, copies the screen in the frame as editable Figma layers, and opens its bar (Entire screen · Select element); paste with Cmd+V in Figma.

## Demo people

| Person | Role | Diet | Help Desk |
|---|---|---|---|
| Kiran Rao (`kiran`) | Biologist | View; **Suggest a change** on a species or a diet | Raises Diet requests and Diet changes |
| Hydar Ali (`hydar`) | Dietician | View | Approves (which applies it), delays or rejects Diet requests; chooses **Save it as** (only those animals, or everyone on that diet). His own requests go to Amruth Reddy |
| Suresh Gowda (`suresh`) | Kitchen Head | View | Raises Diet requests too; sees approved ones as the kitchen |
| Manoj Kumar (`manoj`) | Kitchen Operator | View | Raises Diet requests too (e.g. a food quality issue); sees approved ones as the kitchen; own Maintenance request |

## Project structure

```
.
├── index.html            Entry point: device frame, scripts in load order
├── css/
│   ├── module.css        Frames, layouts, diet parts, Help Desk cards, forms, motion
│   └── diet.css          The Diet side's own rules: the Updated card, the species header, the diet PDF viewer and page
├── js/                   Plain scripts sharing globals; load order is set in index.html
│   ├── masters.js        Sites, sections, enclosures, species, animals, items, stock (generated, do not edit)
│   ├── data.js           People, departments, feed times, diets, nutrients, seed requests, change history
│   ├── model.js          Diet in force per level, Help Desk statuses and rules, approvals (no DOM)
│   ├── ui.js             State, top bar, sheets, diet tables, cards, in-place redraw (morph)
│   ├── diets.js          Diet module screens
│   ├── history.js        A diet's change history
│   ├── helpdesk.js       Help Desk list, request facts, request page A, status bar, Activity
│   ├── form.js           New Request (and Edit): the departments' forms and the diet request types
│   ├── suggest.js        Diet change: Suggest a change (anybody), Review request, Save it as; the species (scope picker), diet and reason search sheets
│   ├── reqviews.js       The request page's diet parts: low stock, what changes, what approving does, the diet now, attachment tiles
│   ├── pdf.js            The diet PDF: one A4 page as Kitchen & Diet prints it, in a full-screen viewer
│   └── app.js            Router, Home frame, prototype controls, saving, frame fitting
├── assets/               Antz Design phone and tablet system (copied unchanged, do not edit)
│   ├── tokens.css
│   ├── antz.css
│   ├── inter-latin.woff2
│   ├── material-symbols-rounded.woff2
│   └── species/          Species photos by taxonomy id (sources in SOURCES.txt)
└── home/                 Copy of the Antz Home build, shown in the frame
    ├── index.html        Unchanged, except one script at the end that opens Diet / Help Desk from the module tiles
    ├── review.css
    └── assets/           Home images, icons and data
```

### Routes

| Hash | Screen |
|---|---|
| `#/home` | Antz Home |
| `#/diets/...` | Diet module |
| `#/history/...` | A diet change, opened from a diet's history |
| `#/requests/...` | Help Desk list and request details |
| `#/new` | Help Desk › New Request |

## Development notes

- **Demo data** is saved in `localStorage` under the `STORE` key in `js/app.js` and reseeds each day. Seed dates are relative to today. Bump the key whenever the shape of the data changes.
- **Redraws** happen in place (`morph` in `js/ui.js`). Each screen carries a `data-k` key: a new key is a new screen, the same key is the same screen updated.
- **Hover** rules sit inside `@media (hover: hover)`, so tapped rows don't stay shaded on touch screens.
- **Motion** turns off with the system's Reduce motion setting.
- Don't name a new class `.thumb`: the species photos already use it.
- The look follows Antz Design: Inter only, Antz type sizes, weights up to 600, 44 px tap targets.
- **Figma alignment (20 Nov 2026):** screens follow the Antz Mobile Handoff Figma.
  - Help Desk follows the Request Module (25 Sep 2025): the request card, My Approvals | All, and the request page with a dark header, one fact per row, Activity and the status bar.
  - Species cards follow the Collection species list (Aug 2025).
  - iPad landscape follows the Hospital iPad (Sep 2026).
- **Labels** follow the Antz Labeling Guidelines.
  - Labels, tabs, headers, buttons and statuses use Title Case, small words too ("Skip A Feed").
  - Sentences and hints keep only the first word capitalised.
  - `tcase()` in `js/ui.js` turns a label into Title Case where it is shown.
- **Animals** go by their AID ("AID 215920"), as in every Antz module.

## Branches

| Branch | Holds |
|---|---|
| `main` | Stable code: what is live on Cloudflare. Only merged into, never committed to directly. |
| `develop` | Ongoing work. Feature branches start here and merge back here. |
| `feature/<short-name>` | One change each, e.g. `feature/diet-filters`. Fixes use `fix/<short-name>`. |

```bash
git checkout develop && git pull
git checkout -b feature/diet-filters
# ...work and commit...
git push -u origin feature/diet-filters
```

Open a pull request from `feature/diet-filters` into `develop`. When a round is approved, open a pull request from `develop` into `main`, merge it, and deploy from `main`.

## Deploy

The site is deployed to the Cloudflare Pages project `antz-diet-module`, from `main`. Deploy a clean copy, so git and local files are not published:

```bash
rsync -a --exclude '.git' --exclude '.DS_Store' --exclude 'HANDOFF_*.md' ./ ../deploy-diet-module/
npx -y wrangler@3 pages deploy ../deploy-diet-module --project-name antz-diet-module --branch main --commit-dirty=true
```

## Credits

The species photos are the lead images of their Wikipedia articles, from Wikimedia Commons, under CC BY-SA or similar licences. Sources are in `assets/species/SOURCES.txt` and `home/assets/img/species/CREDITS.md`. Check each licence before any use outside this prototype.
