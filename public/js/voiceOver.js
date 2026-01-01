// Browser Text-to-Speech for AAROHI
(function () {

  const LANG_MAP = {
    en: "en-IN",
    hi: "hi-IN",
    kn: "kn-IN"
  };

  window.AAROHIVoice = {
    enabled: true,
    rate: 1,
    pitch: 1,
    volume: 1,
    lang: localStorage.getItem("aarohi_lang") || "en"
  };

  // Update language
  window.voiceSetLang = function (lang) {
    localStorage.setItem("aarohi_lang", lang);
    window.AAROHIVoice.lang = lang;
  };

  // Toggle voice globally
  window.voiceToggle = function (state) {
    window.AAROHIVoice.enabled = state;
    localStorage.setItem("aarohi_voice_enabled", state);
  };

  // Stop speaking
  window.voiceStop = function () {
    if (speechSynthesis) speechSynthesis.cancel();
  };

  // Speak text
  window.voiceSpeak = function (text) {
    if (!window.AAROHIVoice.enabled) return;
    if (!text || !window.speechSynthesis) return;

    // Helper: ensure voices are loaded
    const ensureVoices = () => new Promise((resolve) => {
      let voices = speechSynthesis.getVoices();
      if (voices && voices.length) return resolve(voices);
      // voices may arrive asynchronously
      const handler = () => {
        voices = speechSynthesis.getVoices();
        if (voices && voices.length) {
          speechSynthesis.removeEventListener('voiceschanged', handler);
          resolve(voices);
        }
      };
      speechSynthesis.addEventListener('voiceschanged', handler);
      // timeout fallback: resolve after short delay even if empty
      setTimeout(() => resolve(speechSynthesis.getVoices()), 500);
    });

    const findVoiceFor = (voices, langTag) => {
      if (!voices || !voices.length) return null;
      const base = (langTag || '').toLowerCase().split('-')[0];

      // 1) exact language match (startsWith)
      let v = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(base));
      if (v) return v;

      // 2) full tag match
      v = voices.find(v => v.lang && v.lang.toLowerCase() === (langTag||'').toLowerCase());
      if (v) return v;

      // 3) name heuristics (voice name contains 'Kannada' or 'kn')
      v = voices.find(v => /kannada|kn\b|kn-/i.test(v.name) || /kannada/i.test(v.lang));
      if (v) return v;

      // 4) first voice that contains the base in its lang
      v = voices.find(v => v.lang && v.lang.toLowerCase().includes(base));
      if (v) return v;

      return null;
    };

    // Speak asynchronously after ensuring voices are available
    (async () => {
      try {
        const voices = await ensureVoices();
        const langTag = LANG_MAP[window.AAROHIVoice.lang] || 'en-IN';

        const u = new SpeechSynthesisUtterance(text);
        u.lang = langTag;
        u.rate = window.AAROHIVoice.rate;
        u.pitch = window.AAROHIVoice.pitch;
        u.volume = window.AAROHIVoice.volume;

        // Prefer a voice that matches the language
        let selected = findVoiceFor(voices, langTag);

        // If Kannada requested but no Kannada voice, try Hindi as a closer fallback
        if (!selected && (langTag.toLowerCase().startsWith('kn') || langTag.toLowerCase().startsWith('kn-in'))) {
          selected = findVoiceFor(voices, 'hi-IN') || findVoiceFor(voices, 'en-IN');
        }

        if (!selected) {
          // fallback: pick a default voice matching the langTag or first available
          selected = findVoiceFor(voices, langTag) || voices[0];
        }

        if (selected) u.voice = selected;

        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      } catch (err) {
        console.error('[voice] speak error', err);
      }
    })();
  };

  // Hover-based voice (optional)
  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("[data-voice-hover]");
    if (t && t.dataset.voiceHover) {
      voiceSpeak(t.dataset.voiceHover);
    }
  });

  // Click-based voice
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-voice-click]");
    if (t && t.dataset.voiceClick) {
      voiceSpeak(t.dataset.voiceClick);
    }
  });

})();

// Expose helpers for voice debugging and selection
(function(){
  // Return a Promise resolving to available voices (wait for voiceschanged)
  window.getAvailableVoices = function() {
    return new Promise((resolve) => {
      let v = speechSynthesis.getVoices();
      if (v && v.length) return resolve(v);
      const handler = () => {
        const voices = speechSynthesis.getVoices();
        if (voices && voices.length) {
          speechSynthesis.removeEventListener('voiceschanged', handler);
          resolve(voices);
        }
      };
      speechSynthesis.addEventListener('voiceschanged', handler);
      setTimeout(() => resolve(speechSynthesis.getVoices()), 700);
    });
  };

  // Set a preferred voice by its name or voiceURI; stores in localStorage
  window.setPreferredVoice = async function(id) {
    try {
      localStorage.setItem('aarohi_voice_choice', id || '');
      window.AAROHIVoice.preferred = id || null;
    } catch (err) {
      console.error('[voice] setPreferredVoice error', err);
    }
  };

  // Get preferred voice id
  window.getPreferredVoice = function() {
    return localStorage.getItem('aarohi_voice_choice') || null;
  };

  // Ensure any previously chosen preference is loaded into runtime state
  try {
    window.AAROHIVoice.preferred = window.getPreferredVoice();
  } catch (err) {
    window.AAROHIVoice.preferred = null;
  }
})();
