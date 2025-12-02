// public/js/voiceNav.js

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

// Auto-detect Indian languages
recognition.lang = "en-IN";
recognition.interimResults = false;
recognition.maxAlternatives = 1;

const voiceBtn = document.getElementById("voiceBtn");

// Path map for quick navigation
const NAV_PATHS = {
  open_home: "/",
  open_community: "/community",
  open_chat: "/community/chat",
  open_problems: "/community/problems",
  open_sell_animals: "/animals",
  open_sell_crops: "/crops",
  open_stock: "/stock",
  open_tele_vet: "/teleVet",
  open_vet_login: "/vet-auth/login",
  open_dealer_login: "/dealer-auth/login",
};

// Start listening
voiceBtn.addEventListener("click", () => {
  console.log("Voice navigation started…");
  recognition.start();
});

// On speech detection
recognition.onresult = async (event) => {
  const speechText = event.results[0][0].transcript.trim();
  console.log("User said:", speechText);

  try {
    const res = await fetch("/voice/navigate", {
      method: "POST",
      body: JSON.stringify({ query: speechText }),
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();
    const intent = data.intent || "open_home";

    console.log("AI Intent:", intent);

    // Default to home if path not found
    const path = NAV_PATHS[intent] || "/";

    // Redirect
    window.location.href = path;

  } catch (error) {
    console.error("Voice navigation failed:", error);
    window.location.href = "/";
  }
};
