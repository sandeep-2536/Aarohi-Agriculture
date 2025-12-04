// Browser TTS
function speakText(text, lang = "en-IN") {
    if (!window.speechSynthesis) return;

    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = lang;
    msg.rate = 0.95;
    msg.pitch = 1.0;

    speechSynthesis.cancel();
    speechSynthesis.speak(msg);
}

// Auto-speak message (from server)
// Note: speaking is handled by client-side i18n loader (i18n.js) which sets `data-voice`
// and calls the shared `voiceSpeak` helper. Keep this file only for speakText usage.
