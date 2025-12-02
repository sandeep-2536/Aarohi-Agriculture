// public/js/voiceNav.js
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = "kn-IN";  // Kannada first
recognition.interimResults = false;
recognition.maxAlternatives = 1;

document.getElementById("voiceBtn").addEventListener("click", () => {
  recognition.start();
});

recognition.onresult = async (event) => {
  const speechText = event.results[0][0].transcript;
  console.log("User said:", speechText);

  const res = await fetch("/voice/navigate", {
    method: "POST",
    body: JSON.stringify({ query: speechText }),
    headers: { "Content-Type": "application/json" }
  });

  const data = await res.json();

  switch (data.intent) {
    case "open_community":
      window.location.href = "/community";
      break;

    case "open_chat":
      window.location.href = "/community/chat";
      break;

    case "open_problems":
      window.location.href = "/community/problems";
      break;

    case "open_sell_animals":
      window.location.href = "/animals";
      break;

    case "open_sell_crops":
      window.location.href = "/crops";
      break;

    case "open_stock":
      window.location.href = "/stock";
      break;

    case "open_tele_vet":
      window.location.href = "/tele-vet";
      break;

    case "open_vet_login":
      window.location.href = "/vet-auth/login";
      break;

    case "open_dealer_login":
      window.location.href = "/dealer-auth/login";
      break;

    default:
      window.location.href = "/";
  }
};
