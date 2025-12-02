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
  open_tele_vet: "/tele-vet",
  open_vet_login: "/vet-auth/login",
  open_dealer_login: "/dealer-auth/login",

  open_login: "/auth/login",
  open_register: "/auth/register",
  open_profile: "/auth/profile",
  open_farmer_dashboard: "/dashboard",

  open_create_post: "/community/new",
  open_community_feed: "/community",

  open_groups_list: "/community/chat",
  open_start_group_chat: "/community/chat/create",

  open_report_problem: "/community/problems/new",

  open_animals_list: "/animals",
  open_add_animal: "/animals/new",

  open_crops_list: "/crops",
  open_add_crop: "/crops/new",

  open_stock_list: "/stock",
  open_add_stock: "/stock/dealer/new",
  open_dealer_dashboard: "/stock/dealer",

  open_vet_list: "/tele-vet",
  open_vet_dashboard: "/tele-vet/doctor/dashboard",

  open_schemes: "/schemes",

  open_ai_assistant: "/ai/assistant",

  open_farmer_call_list: "/call/farmers",
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
