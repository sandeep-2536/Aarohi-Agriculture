// controllers/voiceController.js
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const voiceCommandHelper = require("../helpers/voiceCommandHelper");

// Initialize Gemini AI with error handling
let genAI;
let model;

try {
    if (!process.env.GEMINI_API_KEY) {
        console.error('[Voice] GEMINI_API_KEY not found in environment variables');
        throw new Error('GEMINI_API_KEY is required');
    }
    
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
            temperature: 0.2,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 200,
        }
    });
    console.log('[Voice] Navigation engine initialized successfully');
} catch (error) {
    console.error('[Voice] Failed to initialize:', error.message);
}

// Comprehensive Intent to Route Mapping with aliases
const INTENT_ROUTING = {
    // Home & Dashboard
    'open_home': { route: '/', aliases: ['home', 'मुखपृष्ठ', 'ಮುಖಪುಟ', 'dashboard_home'] },
    'open_farmer_dashboard': { route: '/dashboard', aliases: ['dashboard', 'डैशबोर्ड', 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', 'my_dashboard', 'profile'] },
    
    // Community & Social
    'open_community': { route: '/community', aliases: ['community', 'समुदाय', 'ಸಮುದಾಯ', 'feed', 'posts'] },
    'open_community_feed': { route: '/community', aliases: ['community_feed', 'posts_feed'] },
    'open_create_post': { route: '/community/new', aliases: ['create_post', 'new_post', 'पोस्ट_बनाओ', 'ಪೋಸ್ಟ್_ರಚಿಸಿ', 'write', 'share'] },
    'open_post_details': { route: '/community/:id', aliases: ['view_post', 'post_details'] },
    'open_my_posts': { route: '/dashboard', aliases: ['my_posts', 'मेरी_पोस्ट', 'ನನ್ನ_ಪೋಸ್ಟ್‌ಗಳು'] },
    
    // Chat & Messaging
    'open_chat': { route: '/community/chat', aliases: ['chat', 'group_chat', 'चैट', 'ಚಾಟ್', 'messages', 'groups', 'talk'] },
    'open_groups_list': { route: '/community/chat', aliases: ['groups', 'group_list', 'समूह', 'ಗುಂಪುಗಳು'] },
    'open_start_group_chat': { route: '/community/chat/create', aliases: ['create_group', 'new_group', 'start_chat', 'नया_समूह', 'ಹೊಸ_ಗುಂಪು'] },
    
    // Problems & Support
    'open_problems': { route: '/community/problems', aliases: ['problems', 'समस्या', 'ಸಮಸ್ಯೆ', 'issues', 'help'] },
    'open_report_problem': { route: '/community/problems/new', aliases: ['report_problem', 'new_problem', 'समस्या_बताओ', 'ಸಮಸ್ಯೆ_ವರದಿ', 'issue'] },
    'open_problem_details': { route: '/community/problems/:id', aliases: ['view_problem', 'problem_details'] },
    
    // Animals
    'open_animals_list': { route: '/animals', aliases: ['animals', 'पशु', 'ಪ್ರಾಣಿ', 'livestock', 'cattle', 'sell_animal', 'buy_animal', 'trade'] },
    'open_add_animal': { route: '/animals/new', aliases: ['add_animal', 'list_animal', 'पशु_बेचो', 'ಪ್ರಾಣಿ_ಮಾರಾಟ', 'sell_livestock'] },
    'open_animal_details': { route: '/animals/:id', aliases: ['view_animal', 'animal_details'] },
    
    // Crops
    'open_crops_list': { route: '/crops', aliases: ['crops', 'फसल', 'ಬೆಳೆ', 'harvest', 'sell_crops', 'farming'] },
    'open_add_crop': { route: '/crops/new', aliases: ['add_crop', 'list_crop', 'फसल_बेचो', 'ಬೆಳೆ_ಮಾರಾಟ', 'sell_harvest'] },
    'open_crop_details': { route: '/crops/:id', aliases: ['view_crop', 'crop_details'] },
    
    // Stock/Marketplace
    'open_stock': { route: '/stock', aliases: ['stock', 'बाज़ार', 'ಮಾರುಕಟ್ಟೆ', 'market', 'supplies', 'buy', 'seeds', 'fertilizer'] },
    'open_stock_list': { route: '/stock', aliases: ['stock_list', 'marketplace'] },
    'open_add_stock': { route: '/stock/dealer/new', aliases: ['add_stock', 'list_stock', 'स्टॉक_जोड़ो', 'ಸ್ಟಾಕ್_ಸೇರಿಸಿ'] },
    'open_stock_details': { route: '/stock/:id', aliases: ['view_stock', 'stock_details'] },
    'open_dealer_dashboard': { route: '/stock/dealer', aliases: ['dealer_dashboard', 'dealer_panel'] },
    
    // Tele-Vet (Doctor Support)
    'open_tele_vet': { route: '/tele-vet', aliases: ['vet', 'doctor', 'डॉक्टर', 'ವೈದ್ಯ', 'animal_health', 'vet_support', 'telecall', 'veterinary'] },
    'open_vet_list': { route: '/tele-vet', aliases: ['vet_list', 'doctors', 'available_vets'] },
    'open_start_vet_call': { route: '/tele-vet/farmer/call/:id', aliases: ['call_vet', 'vet_call', 'speak_doctor'] },
    'open_vet_dashboard': { route: '/tele-vet/doctor/dashboard', aliases: ['vet_dashboard', 'doctor_dashboard'] },
    'open_vet_login': { route: '/vet-auth/login', aliases: ['vet_login', 'doctor_login'] },
    
    // Dealers
    'open_dealer_login': { route: '/dealer-auth/login', aliases: ['dealer_login', 'dealer_signin'] },
    
    // Authentication
    'open_login': { route: '/auth/login', aliases: ['login', 'लॉगिन', 'ಲಾಗಿನ್', 'signin', 'sign_in'] },
    'open_register': { route: '/auth/register', aliases: ['register', 'signup', 'sign_up', 'पंजीकरण', 'ನೋಂದಣಿ'] },
    'open_profile': { route: '/auth/profile', aliases: ['profile', 'my_profile', 'प्रोफाइल', 'ಪ್ರೊಫೈಲ್', 'account', 'settings'] },
    
    // Schemes
    'open_schemes': { route: '/schemes', aliases: ['schemes', 'योजना', 'ಯೋಜನೆ', 'subsidies', 'benefits', 'government', 'govt'] },
    'open_scheme_details': { route: '/schemes/:id', aliases: ['scheme_details', 'view_scheme'] },
    
    // AI Assistant
    'open_ai_assistant': { route: '/ai/assistant', aliases: ['ai', 'assistant', 'एआई', 'ಎಐ', 'chatbot', 'help', 'ask', 'question'] },
    
    // Calls & Video
    'open_farmer_call_list': { route: '/call/farmers', aliases: ['calls', 'call_list', 'कॉल', 'ಕರೆ'] },
    'open_call_room': { route: '/call/room/:id', aliases: ['call_room', 'video_call'] },
};

// Helper function to clean AI response
function cleanAIResponse(text) {
    if (!text) return null;
    
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    text = text.trim();
    
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (jsonMatch) {
        text = jsonMatch[0];
    }
    
    return text;
}

// Parse and validate intent
function parseIntent(text) {
    try {
        const cleaned = cleanAIResponse(text);
        if (!cleaned) {
            console.warn('[Voice] Empty response from AI');
            return 'open_home';
        }
        
        const parsed = JSON.parse(cleaned);
        
        if (!parsed.intent) {
            console.warn('[Voice] No intent field in response:', parsed);
            return 'open_home';
        }
        
        // Validate intent exists in our routing
        if (INTENT_ROUTING[parsed.intent]) {
            return parsed.intent;
        }
        
        console.warn('[Voice] Invalid intent received:', parsed.intent);
        return 'open_home';
        
    } catch (err) {
        console.error('[Voice] JSON parse error:', err.message);
        return 'open_home';
    }
}

// Main navigation processing function
exports.processNavigation = async (req, res) => {
    try {
        if (!req.body || typeof req.body.query !== 'string') {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid request',
                intent: 'open_home',
                route: '/'
            });
        }

        const userQuery = req.body.query.trim();
        const language = req.body.language || 'en';
        const context = req.body.context || {};
        
        if (!userQuery) {
            return res.status(400).json({ 
                success: false,
                error: 'Empty query',
                intent: 'open_home',
                route: '/'
            });
        }

        console.log('[Voice] Query:', userQuery, '| Lang:', language, '| Path:', context.currentPath);

        // Try fast path with command helper first
        const fastMatch = voiceCommandHelper.processCommand(userQuery, language);
        if (fastMatch && fastMatch.matched) {
            console.log('[Voice] Fast match found:', fastMatch.intent, 'confidence:', fastMatch.confidence);
            const routing = INTENT_ROUTING[fastMatch.intent];
            return res.json({ 
                success: true,
                intent: fastMatch.intent,
                route: routing ? routing.route : '/',
                query: userQuery,
                language,
                method: 'alias_match',
                confidence: fastMatch.confidence
            });
        }

        if (!model) {
            return res.status(503).json({ 
                success: false,
                error: 'Service unavailable',
                intent: 'open_home',
                route: '/'
            });
        }

        // Build enhanced prompt with language and context
        const languageGuide = {
            en: 'English (en-IN)',
            hi: 'Hindi (hi-IN)',
            kn: 'Kannada (kn-IN)'
        }[language] || 'English';

        const prompt = `You are the AAROHI Voice Navigation Engine.

USER LANGUAGE: ${languageGuide}
CURRENT PAGE: ${context.currentPath || '/'}
USER QUERY: "${userQuery}"

CRITICAL RULES:
1. Respond ONLY with: {"intent":"intent_name"}
2. NO explanation, markdown, or extra text
3. Choose the BEST matching intent
4. If unclear → return {"intent":"open_home"}
5. Consider user's language for keyword matching

AVAILABLE INTENTS (choose one):
${Object.keys(INTENT_ROUTING).join(', ')}

LANGUAGE-SPECIFIC KEYWORDS:
English: home, dashboard, community, chat, problems, animals, crops, stock, vet, schemes, ai, login
Hindi: घर, डैशबोर्ड, समुदाय, चैट, समस्या, पशु, फसल, बाज़ार, डॉक्टर, योजना, एआई
Kannada: ಮನೆ, ಡ್ಯಾಶ್‌ಬೋರ್ಡ್, ಸಮುದಾಯ, ಚಾಟ್, ಸಮಸ್ಯೆ, ಪ್ರಾಣಿ, ಬೆಳೆ, ಮಾರುಕಟ್ಟೆ, ವೈದ್ಯ, ಯೋಜನೆ

Respond with JSON only:`;

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), 8000)
        );

        const aiPromise = model.generateContent(prompt);
        const result = await Promise.race([aiPromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text().trim();

        console.log('[Voice] AI response:', text);

        const intent = parseIntent(text);
        const routing = INTENT_ROUTING[intent];
        const route = routing ? routing.route : '/';

        console.log('[Voice] Intent:', intent, '→ Route:', route);

        return res.json({ 
            success: true,
            intent,
            route,
            query: userQuery,
            language,
            method: 'ai_match',
            confidence: 0.8
        });

    } catch (err) {
        console.error('[Voice] Error:', err.message);

        let errorCode = 500;
        if (err.message?.includes('timeout')) errorCode = 504;
        if (err.message?.includes('API key')) errorCode = 500;
        if (err.message?.includes('quota') || err.message?.includes('rate limit')) errorCode = 429;

        return res.status(errorCode).json({ 
            success: false,
            error: 'Processing failed',
            intent: 'open_home',
            route: '/',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};