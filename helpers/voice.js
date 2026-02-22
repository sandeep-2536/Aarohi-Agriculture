// Placeholder for voice utilities (e.g., TTS or STT integration)
// This file can be expanded if server-side TTS/STS is required.

// node-fetch v3 exports a default; handle both CommonJS and ESM styles
const _nf = require('node-fetch');
const fetch = _nf.default || _nf;

exports.speak = async (text, lang = 'en') => {
  // basic proxy to a third-party TTS service (Google Translate) for languages
  // not available in the browser (e.g. Kannada on Windows).
  // This is deliberately lightweight; if the project later adopts a paid
  // TTS provider the logic can be swapped here.
  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(
      lang
    )}&client=gtx&q=${encodeURIComponent(text)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    return resp.body; // caller may pipe
  } catch (err) {
    console.error('[voice] server speak error', err);
    throw err;
  }
};

exports.listen = async () => {
  // Integrate with STT provider when needed
  console.log('listen() called');
};
