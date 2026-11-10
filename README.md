# Indie Metadata Kit

A metadata manager for indie musicians getting their first releases ready for
distribution. It helps you keep every release's facts in one place and export
them in the formats distributors, playlist curators, and press actually ask
for.

## What it does

- Keep a record per release: title, artist, release type, genre/mood tags,
  release date, label, UPC/EAN, copyright (&copy;) and publishing (&#8471;)
  lines, language, explicit flag, and cover art.
- Per-track credits: title, duration, ISRC, songwriters, producers,
  performers &mdash; the info you'll need later for royalty splits and PRO
  registration, so it's worth capturing from day one.
- A bio and one-line pitch field for press/playlist outreach.
- Inline plain-English explanations of fields like ISRC, UPC, and the
  copyright vs. publishing lines, for artists doing this for the first time.
- Export a release as JSON, as a CSV (one row per track, ready to paste into
  a distributor form or spreadsheet), or copy a ready-to-send EPK text block.

## Running it

```
npm install
npm start
```

Serves on `0.0.0.0:8100`. Release data is stored in `data/releases.json`;
cover art uploads go to `public/uploads/`.
