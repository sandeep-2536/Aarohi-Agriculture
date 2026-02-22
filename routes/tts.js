const express = require('express');
// node-fetch v3 exports a default; handle both CommonJS and ESM styles
const _nf = require('node-fetch');
const fetch = _nf.default || _nf;
const router = express.Router();

// simple TTS proxy endpoint; returns an audio/mpeg stream
// queries the Google Translate TTS service.  used primarily for Kannada
// when the browser has no native voice.
router.get('/', async (req, res) => {
  const { lang, text } = req.query;
  if (!lang || !text) return res.status(400).send('lang and text required');

  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(
      lang
    )}&client=gtx&q=${encodeURIComponent(text)}`;

    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    res.set('Content-Type', 'audio/mpeg');
    resp.body.pipe(res);
  } catch (err) {
    console.error('[tts] proxy error', err);
    res.status(500).send('TTS proxy failed');
  }
});

module.exports = router;
