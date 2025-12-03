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

    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_MAP[window.AAROHIVoice.lang] || "en-IN";
    u.rate = window.AAROHIVoice.rate;
    u.pitch = window.AAROHIVoice.pitch;
    u.volume = window.AAROHIVoice.volume;

    speechSynthesis.cancel();
    speechSynthesis.speak(u);
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
