const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

router.get('/:lang', (req, res) => {
  const lang = req.params.lang;
  const allowed = ['en','hi','kn'];
  if (!allowed.includes(lang)) return res.status(400).json({ error: 'Unsupported language' });

  const file = path.join(__dirname, '..', 'locales', `${lang}.json`);
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const json = JSON.parse(raw);
    res.json(json);
  } catch (err) {
    console.error('[i18n] failed to read locale', file, err);
    res.status(500).json({ error: 'Failed to load locale' });
  }
});

module.exports = router;
