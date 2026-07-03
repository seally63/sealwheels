# Sealwheels

Mobile-first landing page for a UK car-affordability creator. It renders a ranked list
of featured cars (each showing the **net salary you'd realistically need to run it**), a
prominent **"Find me a car"** enquiry form, and a quieter **"Film it next"** suggestion box.

**Tagline:** *How much do you need to make to own it.*

Plain HTML/CSS/JS — **no framework, no build step.** Deploys as static files.

```
index.html      the page shell (no car data lives here)
styles.css      all styling (the "Garage" dark identity)
render.js       loads cars.json, renders the cards, wires the forms
cars.json       ← THE ONLY FILE YOU EDIT to add/update a car
images/         car clip thumbnails (TikTok covers)
tools/
  fetch-thumbs.sh   optional: pulls TikTok covers into images/
```

---

## Add a new car (the 60-second job)

Open **`cars.json`** and append one object to the `cars` array. That's it — never touch
the HTML/CSS/JS.

```jsonc
{
  "name": "Porsche 911 GT3 RS",          // required · display name
  "year": "2024",                         // required · model year only (plate codes / trim text are auto-stripped on display)
  "price": 195000,                         // required · your Auto Trader MEDIAN price (GBP int, basis for the salary)
  "salaryNet": 142000,                     // required · take-home £/yr needed — the big lime hero figure
  "salaryGross": 250000,                   // required · gross £/yr equivalent (stored; not shown on the card)
  "milesPerYear": 5000,                    // OPTIONAL · annual mileage the figures assume. OMIT for 5000 (default). Shown as "5k mi/yr".
  "listingUrl": "https://dealer.com/…",   // the exact car for sale ("" if none / sold)
  "fallbackUrl": "https://dealer.com/search?q=gt3+rs", // used when listingUrl is empty (sold cars)
  "dealer": "Alexanders Prestige",         // shown in the CTA: "View at <dealer> →" ("" when sold)
  "status": "live",                        // "live" | "sold"
  "posted": true,                          // whether the clip is uploaded (kept for your own filtering)
  "platform": "tiktok",                    // "tiktok" | "instagram" — sets the thumbnail badge
  "videoUrl": "https://www.tiktok.com/@lil_seal63/video/123…", // the posted clip ("" = shows a "clip soon" thumb)
  "image": "porsche-911-gt3rs.jpg"         // thumbnail file in /images (see "Thumbnails" below)
}
```

- **Money fields are plain integers** — no `£`, no commas. The page formats them
  (`58000` → `£58,000`, `60950` → `£60,950`).
- Newest car at the **top** of the array shows at the top of the list.
- The **brand filter** on the page is automatic — brands are inferred from `name`.
  Only add a `"brand": "…"` field to a car if the auto-detect gets it wrong (e.g. a
  new multi-word marque it doesn't know).
- Bump `meta.lastUpdated` if you like (cosmetic).

## Mark a car as sold

Find the car in `cars.json` and change **one field**:

```jsonc
"status": "sold"
```

The card automatically greys out with a **SOLD** stamp and its links switch to
`fallbackUrl` (the "find similar" search). Usually you'll also blank `listingUrl` (`""`)
since the original listing is gone. Leave the car in the list — sold cars are good proof.

## Thumbnails (the clip covers)

Each posted car shows its **TikTok cover** as the tappable thumbnail. Because TikTok's own
cover URLs expire within ~48h and can't be hotlinked, we **save the cover as a file** in
`images/` and reference it via the `image` field.

To pull covers automatically (needs the video's `videoUrl` filled in):

```bash
./tools/fetch-thumbs.sh          # fetch any covers that are missing
./tools/fetch-thumbs.sh --force  # re-fetch everything
```

Run it after posting a new video. Until a cover exists, that card shows a coloured
gradient placeholder (with a ▶ badge if it has a `videoUrl`, or a dashed **CLIP SOON**
tile if it doesn't) — it never looks broken. You can also just drop your own image file
into `images/` and point `image` at it.

---

## Wire up the forms (Formspree)

The two forms submit to **separate** destinations so buyer leads and content votes stay
apart. Both are placeholders until you paste your endpoints.

1. Go to **https://formspree.io**, create **two** forms:
   - one for **"Find me a car"** (buyer leads)
   - one for **"Film it next"** (content votes)
2. Copy each form's endpoint (looks like `https://formspree.io/f/abcdwxyz`).
3. Open **`render.js`** and paste them into the two constants near the top:

```js
const FORMSPREE_LEADS = 'https://formspree.io/f/REPLACE_LEADS_ID'; // Find me a car
const FORMSPREE_VOTES = 'https://formspree.io/f/REPLACE_VOTES_ID'; // Film it next
```

Until you do, submitting shows *"Form not connected yet."* After you paste them,
submissions arrive by email / in your Formspree dashboard, tagged by the `_subject` line
so you can tell leads from votes at a glance.

---

## Deploy (pick one — all free, no build step)

The repo is already on GitHub: **github.com/seally63/sealwheels**.

**GitHub Pages**
1. Repo → **Settings → Pages**.
2. Source: **Deploy from a branch**, branch **`main`**, folder **`/ (root)`**, Save.
3. Live at `https://seally63.github.io/sealwheels/` in a minute. Every push redeploys.

**Netlify** — New site → import the GitHub repo → build command **blank**, publish dir **`/`** → Deploy.

**Cloudflare Pages** — Create project → connect the repo → framework preset **None**, build command **blank**, output dir **`/`** → Deploy.

To publish an update after editing `cars.json`:

```bash
git add cars.json images
git commit -m "Add <car>"
git push
```

The push *is* the deploy.

### Preview locally

Open a terminal in the project and run any static server (needed because the page
`fetch`es `cars.json`, which won't work from a `file://` URL):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## Later: drive the list from a Google Sheet

If editing JSON ever feels like too much, you can add a car from your phone via a Google
Sheet instead. `render.js` has a commented `loadCars()` swap point showing where to fetch
the sheet (published as CSV/JSON) and map rows to the same car shape — **not implemented
now**, just marked for when you want it.
