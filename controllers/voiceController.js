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
You are the navigation engine for AAROHI Agriculture Platform.

The farmer will speak in Kannada, Hindi, or English.
Your job is to understand the farmer's statement and convert it into ONE EXACT navigation intent.

Here are the possible intents:
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

Examples:
"community ge hogi" -> open_community
"sell cow" -> open_sell_items
"doctor call" -> open_tele_vet
"strock elli sigatte" -> open_stock
“बेचना है गाय” -> open_sell_animals
“मुझे डॉक्टर चाहिए” -> open_tele_vet
“stock check madbeku” -> open_stock
“dealer login” -> open_dealer_login

Strict output format:
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
