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
document.addEventListener("DOMContentLoaded", () => {
    const text = document.body.getAttribute("data-voice");
    const lang = document.body.getAttribute("data-lang") || "en-IN";

    if (text) {
        speakText(text, lang);
    }
});
