const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// The System Prompt (Persona and Rules)
// NOTE: keep paths up-to-date (tele-vet -> teleVet elsewhere in app)
const SYSTEM_INSTRUCTION = `
You are “AAROHI AI Assistant” — a friendly agricultural guide for farmers.

Your responsibilities:
1. SPEAK LIKE THIS:
- Very simple language
- Short sentences
- No technical words
- Local tone (Kannada/Hindi/English based on farmer input)
- Respectful and farmer-friendly

2. WHAT YOU CAN HELP WITH:
✓ Explain how to use the AAROHI platform
✓ Guide the farmer where to find features
✓ Help with voice navigation
✓ Explain: community, chat, stock, crops, animals, teleVet
✓ Farming advice related to: pests, diseases, crops, soil, fertilizers, rainfall, seeds, animal health, best practices

3. IMPORTANT RULES:
- Always answer in the same language the farmer uses
- Keep messages short and clear
- If farmer seems confused → provide step-by-step
- If farmer asks “where to find ___” → give exact path (e.g., "Go to /stock")
- If farmer asks “how to do ___” → give simple steps
- If farmer asks something dangerous → warn them
- If farmer mentions navigation → give correct page path

4. AAROHI PLATFORM STRUCTURE (for accurate guidance):
- Home → /
- Community Feed → /community
- Group Chat → /community/chat
- Community Problems → /community/problems
- Sell Animals (goat/cow) → /animals
- Sell Crops → /crops
- Stock Availability → /stock
- Tele-Veterinary (Doctor Video Call) → /teleVet
- Vet Login → /vet-auth/login
- Dealer Login → /dealer-auth/login

5. ANSWER STYLE:
- Be kind and motivating
- Use emojis sometimes (🌾🐄🚜)
- Don’t give very long paragraphs
- Farmers should feel safe and supported

6. WHAT NOT TO DO:
✗ Do not give medical prescriptions
✗ Do not give chemical dosages
✗ Do not give guaranteed predictions
✗ Do not output code
✗ Do not mention internal systems

Your goal is to help the farmer with navigation, features, and agriculture knowledge. Always be simple, clear, and local.
`;

// Note: We'll lazy-initialize the SDK/model per-request so we can detect configuration errors
let cachedModel = null;

// GET: Render the Assistant Page
exports.assistant = (req, res) => {
    res.render('ai/assistant', { title: 'AI Assistant' });
};

// POST: Handle Chat Request
exports.analyze = async (req, res) => {
    try {
        const userMessage = req.body.message;

        if (!userMessage) {
            return res.status(400).json({ reply: "Please say something, I am listening! 👂" });
        }

        // Ensure Gemini API key is configured
        if (!process.env.GEMINI_API_KEY) {
            console.error('[ai] GEMINI_API_KEY is not set');
            return res.status(500).json({ reply: 'AI service not configured. Please set GEMINI_API_KEY in environment.' });
        }

        // Lazy-init model (caching for repeated requests)
        if (!cachedModel) {
            try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                cachedModel = genAI.getGenerativeModel({
                    model: process.env.GEMINI_MODEL || 'gemini-pro',
                    systemInstruction: SYSTEM_INSTRUCTION
                });
            } catch (err) {
                console.error('[ai] failed to initialize Gemini model', err);
                return res.status(500).json({ reply: 'AI initialization failed. Check server logs.' });
            }
        }

        // Start a chat session (this allows the AI to remember the conversation context)
        const chat = cachedModel.startChat({ history: [] });

        // send the user message and wait for response
        let result;
        try {
            result = await chat.sendMessage(userMessage);
        } catch (err) {
            console.error('[ai] sendMessage error', err);
            return res.status(502).json({ reply: 'AI service did not respond. Please try again later.' });
        }

        if (!result || !result.response) {
            console.error('[ai] no response object from Gemini', { result });
            return res.status(502).json({ reply: 'No response from AI service. Try again later.' });
        }

        const response = result.response;
        let text = '';
        try {
            text = response.text();
        } catch (err) {
            console.error('[ai] error reading response text', err, response);
            return res.status(502).json({ reply: 'Failed to read AI response.' });
        }

        res.json({ reply: text });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ 
            reply: "Sorry, I am having trouble thinking right now. Please try again later. 🙏" 
        });
    }
};