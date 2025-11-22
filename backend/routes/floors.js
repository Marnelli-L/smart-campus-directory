const express = require('express');
const Logger = require('../utils/logger');
const logger = new Logger('floors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const FLOOR_DIR = path.resolve(__dirname, '..', 'floor-maps');
// Ensure folder exists
fs.mkdirSync(FLOOR_DIR, { recursive: true });

// Configure multer storage in memory (we will validate then write to disk)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const validFloors = new Set(['ground', '2', '3', '4']);

router.get('/', async (req, res) => {
  try {
    const items = [];
    for (const f of validFloors) {
      const filePath = path.join(FLOOR_DIR, `${f}.geojson`);
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        items.push({ floor: f, path: `/floor-maps/${f}.geojson`, updatedAt: stat.mtime.toISOString() });
      }
    }
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/:floor', (req, res) => {
  const floor = String(req.params.floor || '').toLowerCase();
  if (!validFloors.has(floor)) {
    return res.status(400).json({ success: false, message: 'Invalid floor. Use ground, 2, 3, or 4.' });
  }
  const filePath = path.join(FLOOR_DIR, `${floor}.geojson`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Floor GeoJSON not found' });
  }
  res.sendFile(filePath);
});

router.post('/upload', upload.single('file'), (req, res) => {
  try {
    const floor = String(req.query.floor || req.body.floor || '').toLowerCase();
    if (!validFloors.has(floor)) {
      return res.status(400).json({ success: false, message: 'Invalid floor. Use ground, 2, 3, or 4.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Use form field name "file".' });
    }

    // Basic validation: ensure it is JSON and looks like GeoJSON
    let parsed;
    try {
      parsed = JSON.parse(req.file.buffer.toString('utf8'));
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid JSON format.' });
    }

    if (!parsed || (parsed.type !== 'FeatureCollection' && parsed.type !== 'Feature')) {
      return res.status(400).json({ success: false, message: 'Invalid GeoJSON. Expect FeatureCollection or Feature.' });
    }

    const outPath = path.join(FLOOR_DIR, `${floor}.geojson`);
    fs.writeFileSync(outPath, JSON.stringify(parsed));

    return res.json({ success: true, message: 'GeoJSON uploaded', floor, path: `/floor-maps/${floor}.geojson` });
  } catch (e) {
    logger.error('Floor upload error:', e);
    return res.status(500).json({ success: false, message: 'Upload failed', error: e.message });
  }
});

module.exports = router;
