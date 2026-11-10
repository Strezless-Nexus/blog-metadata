const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8100;
const DATA_FILE = path.join(__dirname, 'data', 'releases.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

function readReleases() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    return [];
  }
}

function writeReleases(releases) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(releases, null, 2));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, crypto.randomUUID() + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image uploads are allowed'));
  },
});

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/releases', (req, res) => {
  res.json(readReleases());
});

app.get('/api/releases/:id', (req, res) => {
  const release = readReleases().find((r) => r.id === req.params.id);
  if (!release) return res.status(404).json({ error: 'Not found' });
  res.json(release);
});

app.post('/api/releases', (req, res) => {
  const releases = readReleases();
  const now = new Date().toISOString();
  const release = {
    ...req.body,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  releases.push(release);
  writeReleases(releases);
  res.status(201).json(release);
});

app.put('/api/releases/:id', (req, res) => {
  const releases = readReleases();
  const idx = releases.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  releases[idx] = {
    ...releases[idx],
    ...req.body,
    id: releases[idx].id,
    createdAt: releases[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  writeReleases(releases);
  res.json(releases[idx]);
});

app.delete('/api/releases/:id', (req, res) => {
  const releases = readReleases();
  const next = releases.filter((r) => r.id !== req.params.id);
  if (next.length === releases.length) return res.status(404).json({ error: 'Not found' });
  writeReleases(next);
  res.status(204).end();
});

app.post('/api/upload', (req, res) => {
  upload.single('cover')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: '/uploads/' + req.file.filename });
  });
});

function csvEscape(value) {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

app.get('/api/releases/:id/csv', (req, res) => {
  const release = readReleases().find((r) => r.id === req.params.id);
  if (!release) return res.status(404).json({ error: 'Not found' });
  const headers = [
    'release_title', 'artist', 'track_number', 'track_title', 'duration',
    'isrc', 'songwriters', 'producers', 'performers', 'explicit',
    'genre', 'secondary_genre', 'release_date', 'upc', 'copyright_line', 'publishing_line',
  ];
  const rows = (release.tracks && release.tracks.length ? release.tracks : [{}]).map((t) => [
    release.title, release.artist, t.trackNumber, t.title, t.duration,
    t.isrc, t.songwriters, t.producers, t.performers, t.explicit ? 'Yes' : 'No',
    release.genre, release.secondaryGenre, release.releaseDate, release.upc,
    release.copyrightLine, release.publishingLine,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${(release.title || 'release').replace(/[^a-z0-9-_]+/gi, '_')}.csv"`);
  res.send(csv);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Indie Metadata Kit listening on 0.0.0.0:${PORT}`);
});
