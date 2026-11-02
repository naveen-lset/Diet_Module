# Antz Diet Module

Phone and iPad prototype of the Antz **Diet** module and the **Help Desk** diet requests, opened from the Antz Home (Modules › Diet, Modules › Help Desk).

**Live:** https://antz-diet-module.pages.dev

- **Diet:** browse diets by diet or by species. A species shows its diets at every level (species, site, section, enclosure, animal). A diet shows its details, certifications, notes, nutrition and its own change history. The app only views diets; editing stays on the web.
- **Help Desk:** list, raise and approve requests. Diet is one department; Dieticians raise diet requests and the Kitchen Head approves them. Approving a diet request changes the diets and writes the diet history.
- **Layouts:** the phone drills in one screen at a time with bottom sheets. The iPad (portrait and landscape) uses a split view.

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
| `?as=` | `hydar` · `suresh` · `manoj` | Person you view as |
| `?fill` | | Fill the window with no frame (a real phone or iPad fills on its own) |

Example: http://127.0.0.1:8766/?f=landscape&as=suresh

The controls above the device frame (Frame · Viewing as · Home · Reset demo data · Copy to Figma) are prototype tools, not part of the app. **Copy to Figma** loads Figma's capture script (mcp.figma.com) on first use, copies the screen in the frame as editable Figma layers, and opens its bar (Entire screen · Select element); paste with Cmd+V in Figma.

## Demo people

| Person | Role | Diet | Help Desk |
|---|---|---|---|
| Hydar Ali (`hydar`) | Dietician | View, raise diet requests | Own requests; can request to Diet |
| Suresh Gowda (`suresh`) | Kitchen Head | View | Approves, delays or rejects Diet requests |
| Manoj Kumar (`manoj`) | Kitchen Operator | View only | Own requests; cannot request to Diet |

## Project structure

```
.
├── index.html            Entry point: device frame, scripts in load order
├── css/
│   └── module.css        Frames, layouts, diet parts, Help Desk cards, forms, motion
├── js/                   Plain scripts sharing globals; load order is set in index.html
│   ├── masters.js        Sites, sections, enclosures, species, animals, items, stock (generated, do not edit)
│   ├── data.js           People, departments, feed times, diets, nutrients, seed requests, change history
│   ├── model.js          Diet in force per level, Help Desk statuses and rules, approvals (no DOM)
│   ├── ui.js             State, top bar, sheets, diet tables, cards, in-place redraw (morph)
│   ├── diets.js          Diet module screens
│   ├── history.js        A diet's change history
│   ├── helpdesk.js       Help Desk list and request details
│   ├── form.js           New Request (and Edit)
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
