// controllers/voiceController.js
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

exports.processNavigation = async (req, res) => {
  try {
    const userQuery = req.body.query || "";
    console.log(req.body.query);
 const prompt = `
You are the AAROHI Navigation Engine.

Your ONLY job:
Given a user’s speech (Kannada/Hindi/English/mixed),
RETURN EXACTLY ONE INTENT that tells which page should open.

IMPORTANT RULES:
- Respond ONLY with JSON: {"intent":"..."}
- Do NOT explain.
- Do NOT output extra characters.
- Do NOT hallucinate new intents.
- Choose the closest intent EVEN IF user sentence is unclear.
- If unsure, return: {"intent":"open_home"}

AAROHI WEBSITE STRUCTURE (for reasoning):
- Home → GET /
- Community Feed → /community
- Community Chat → /community/chat
- Community Problems → /community/problems
- Animal Market → /animals
- Crop Selling → /crops
- Stock / Input Availability → /stock
- Tele-Veterinary (Video Call with doctor) → /teleVet
- Vet Login → /vet-auth/login
- Dealer Login → /dealer-auth/login

VALID INTENTS:
- open_home
- open_community
- open_chat
- open_problems
- open_sell_animals
- open_sell_crops
- open_stock
- open_tele_vet
- open_vet_login
- open_dealer_login

MULTILINGUAL UNDERSTANDING:
(Kannada examples)
- “community ge hogi”, “community open”, “samudaya nodi” → open_community
- “hasu maargona”, “pasu sale”, “aavu thorisu” → open_sell_animals
- “stock elli sigatte”, “stock beku”, “input nodi” → open_stock
- “doctor call madbeku”, “veterinary beku”, “prani vaidya” → open_tele_vet

(Hindi examples)
- “समुदाय दिखाओ”, “कम्युनिटी चलो”, “feed खोलो” → open_community
- “गाय बेचना”, “पशु बेचना है”, “जानवर बिक्री” → open_sell_animals
- “फसल बेचना”, "धान बेचना", "crop sell" → open_sell_crops
- “स्टॉक कहाँ है”, “स्टॉक दिखाओ”, “बीज कहाँ मिलेगा” → open_stock
- “डॉक्टर चाहिए”, “वेट कॉल करना है”, “पशु डॉक्टर” → open_tele_vet

(English examples)
- “open community”, “go to feed”, “show posts” → open_community
- “sell animals”, “animal market”, “cow for sale” → open_sell_animals
- “sell crops”, “crop market”, “post crop” → open_sell_crops
- “check stock”, “stock availability”, “open marketplace” → open_stock
- “call doctor”, “open tele vet”, “video doctor” → open_tele_vet

NOISE HANDLING (these still count):
- “ah… community… open madona”
- “umm stock… gotilla where…”
- “doctor… beku… video…”

STRICT OUTPUT FORMAT:
{"intent":"one_of_the_intents"}

User said:
${userQuery}
`;



    const response = await model.generateContent(prompt);
    const text = response.response.text().trim();

    let intent = "open_home";
    try {
      intent = JSON.parse(text).intent;
    } catch (err) {
      console.log("JSON parse error:", err);
    }

    return res.json({ intent });

  } catch (err) {
    console.error("Voice Navigation Error:", err);
    res.status(500).json({ error: "Voice processing failed" });
  }
};
