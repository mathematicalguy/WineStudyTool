'use strict';

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const express = require('express');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const PUBLIC_DIR = path.join(__dirname, 'public');
const MAPS_DIR = path.join(PUBLIC_DIR, 'maps');
const POLY_DIR = path.join(PUBLIC_DIR, 'polyregions');

app.use(express.json({ limit: '5mb' }));
app.use(express.static(PUBLIC_DIR));

app.get('/api/health', (req, res) => res.json({ ok: true }));

function ensureDirs() {
  [PUBLIC_DIR, MAPS_DIR, POLY_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}
ensureDirs();

// List available map images
app.get('/api/maps', (req, res) => {
  fs.readdir(MAPS_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to list maps' });
    const images = files.filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));
    res.json(images);
  });
});

// Get polygon data for a map
app.get('/api/polygons/:mapName', (req, res) => {
  const mapName = req.params.mapName;
  const jsonName = mapName.replace(/\.[^.]+$/, '') + '.json';
  const filePath = path.join(POLY_DIR, jsonName);
  if (!fs.existsSync(filePath)) return res.json({ regions: [] });
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read polygon data' });
    try { res.json(JSON.parse(data)); } catch (e) {
      console.error('Invalid polygon data', e);
      res.status(500).json({ error: 'Invalid polygon data' });
    }
  });
});

// Save polygon data for a map
app.post('/api/polygons/:mapName', (req, res) => {
  const mapName = req.params.mapName;
  const jsonName = mapName.replace(/\.[^.]+$/, '') + '.json';
  const filePath = path.join(POLY_DIR, jsonName);
  const data = req.body;
  if (!data || !Array.isArray(data.regions)) {
    return res.status(400).json({ error: 'Invalid payload: expected { regions: [...] }' });
  }
  fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', (err) => {
    if (err) return res.status(500).json({ error: 'Failed to save polygon data' });
    res.json({ ok: true });
  });
});

// Global error logging
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

function openBrowser(url) {
  try {
    const cmd = process.platform === 'darwin' ? `open "${url}"`
      : process.platform === 'win32' ? `start "" "${url}"`
      : `xdg-open "${url}"`;
    exec(cmd, (err) => { if (err) console.error('Failed to open browser:', err.message); });
  } catch (e) {
    console.error('Open browser error:', e);
  }
}

const server = app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`WineStudyTool server running at ${url}`);
  // Best effort to open browser automatically
  openBrowser(url);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
