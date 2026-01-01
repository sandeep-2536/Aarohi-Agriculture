// client-side i18n helper: fetches /i18n/:lang and applies translations to elements
(function(){
  function getByKey(obj, path) {
    return path.split('.').reduce((o,k)=> (o && o[k] !== undefined) ? o[k] : null, obj);
  }

  async function loadLocale(lang) {
    try {
      const res = await fetch(`/i18n/${lang}`);
      if (!res.ok) throw new Error('Failed to load locale');
      return await res.json();
    } catch (err) {
      console.error('[i18n] loadLocale error', err);
      return null;
    }
  }

  function applyTranslations(locale) {
    if (!locale) return;
    // elements with data-i18n attribute: set innerText
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = getByKey(locale, key);
      if (val !== null && val !== undefined) {
        el.innerText = val;
      }
    });

    // placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = getByKey(locale, key);
      if (val !== null && val !== undefined) {
        el.setAttribute('placeholder', val);
      }
    });

    // option texts (for selects using data-i18n-option="path")
    document.querySelectorAll('[data-i18n-option]').forEach(el => {
      const key = el.getAttribute('data-i18n-option');
      const val = getByKey(locale, key);
      if (val && Array.isArray(val)) {
        // clear and render
        el.innerHTML = '';
        val.forEach(item => {
          const opt = document.createElement('option');
          opt.value = item.value || item.key || '';
          opt.innerText = item.label || item.text || item;
          el.appendChild(opt);
        });
      }
    });

    // data-i18n-voice: set data-voice attribute (used by pageVoice/page TTS)
    document.querySelectorAll('[data-i18n-voice]').forEach(el => {
      const key = el.getAttribute('data-i18n-voice');
      const val = getByKey(locale, key);
      if (val !== null && val !== undefined) {
        el.setAttribute('data-voice', val);
      }
    });

    // After applying translations, if body has data-voice and voiceSpeak is available, speak it
    try {
      const bodyVoice = document.body.getAttribute('data-voice');
      if (bodyVoice && window.voiceSpeak) {
        window.voiceSpeak(bodyVoice);
      }
    } catch (err) {
      console.error('[i18n] speak error', err);
    }
  }

  window.setLanguage = async function(lang) {
    try {
      // set cookie for server (expiry 1 year)
      document.cookie = `aarohi_lang=${lang}; path=/; max-age=${60*60*24*365}`;
      localStorage.setItem('aarohi_lang', lang);
      // update voice as well
      if (window.voiceSetLang) window.voiceSetLang(lang);

      const locale = await loadLocale(lang);
      applyTranslations(locale);

      // optional: reload to let server render server-side strings on full pages
      // but we try to update on-page first
    } catch (err) {
      console.error('[i18n] setLanguage error', err);
    }
  };

  // Auto-apply on load
  document.addEventListener('DOMContentLoaded', async () => {
    const lang = localStorage.getItem('aarohi_lang') || (window.SERVER_USER_LANG || 'en');
    const locale = await loadLocale(lang);
    applyTranslations(locale);
  });
})();
