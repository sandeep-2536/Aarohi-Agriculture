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
- No explanation.
- No extra text.
- No markdown.
- Choose the CLOSEST INTENT.
- If user speech references a specific item (post/crop/problem/stock/animal),
  return the correct *detail* intent even without id.
- If unclear, return: {"intent":"open_home"}

===== FULL WEBSITE ROUTE MAP =====
(Home)
- open_home → /

(Community)
- open_community → /community
- open_community_feed → /community
- open_create_post → /community/new
- open_post_details → /community/:id
- open_my_posts → /dashboard
- open_chat → /community/chat
- open_groups_list → /community/chat
- open_start_group_chat → /community/chat/create

(Problems)
- open_problems → /community/problems
- open_report_problem → /community/problems/new
- open_problem_details → /community/problems/:id
- open_my_problems → /dashboard

(Animals)
- open_animals_list → /animals
- open_add_animal → /animals/new
- open_animal_details → /animals/:id

(Crops)
- open_crops_list → /crops
- open_add_crop → /crops/new
- open_crop_details → /crops/:id

(Stock)
- open_stock → /stock
- open_stock_list → /stock
- open_add_stock → /stock/dealer/new
- open_stock_details → /stock/:id
- open_dealer_dashboard → /stock/dealer

(Tele-Vet)
- open_tele_vet → /tele-vet
- open_vet_list → /tele-vet
- open_start_vet_call → /tele-vet/farmer/call/:id
- open_vet_dashboard → /tele-vet/doctor/dashboard
- open_vet_login → /vet-auth/login

(Dealers)
- open_dealer_login → /dealer-auth/login

(Auth & User)
- open_login → /auth/login
- open_register → /auth/register
- open_profile → /auth/profile
- open_farmer_dashboard → /dashboard

(Schemes)
- open_schemes → /schemes
- open_scheme_details → /schemes/:id

(AI Assistant)
- open_ai_assistant → /ai/assistant

(Call System)
- open_farmer_call_list → /call/farmers
- open_call_room → /call/room/:id

===== STRICT OUTPUT FORMAT =====
{"intent":"one_of_the_above"}

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
