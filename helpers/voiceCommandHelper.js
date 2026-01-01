// helpers/voiceCommandHelper.js - Voice Command Processing Utilities
const log = (msg) => console.log(`[Voice Helper] ${msg}`);

/**
 * Voice Command Helper - Processes voice queries before sending to AI
 * Handles command aliases, patterns, and contextual awareness
 */
class VoiceCommandHelper {
    constructor() {
        this.commandAliases = this.initializeAliases();
        this.patterns = this.initializePatterns();
        this.context = {
            lastIntent: null,
            lastRoute: null,
            sessionCommands: []
        };
    }

    /**
     * Initialize command aliases for quick matching
     * Maps common voice phrases to intents without AI call
     */
    initializeAliases() {
        return {
            // Navigation
            'home': 'open_home',
            'मुखपृष्ठ': 'open_home',
            'ಮುಖಪುಟ': 'open_home',
            'dashboard': 'open_farmer_dashboard',
            'डैशबोर्ड': 'open_farmer_dashboard',
            'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್': 'open_farmer_dashboard',
            
            // Community
            'community': 'open_community',
            'समुदाय': 'open_community',
            'ಸಮುದಾಯ': 'open_community',
            'feed': 'open_community',
            'posts': 'open_community',
            'chat': 'open_chat',
            'चैट': 'open_chat',
            'ಚಾಟ್': 'open_chat',
            'new post': 'open_create_post',
            'post बनाओ': 'open_create_post',
            'ಪೋಸ್ಟ್ ರಚಿಸಿ': 'open_create_post',
            
            // Problems
            'problems': 'open_problems',
            'समस्या': 'open_problems',
            'ಸಮಸ್ಯೆ': 'open_problems',
            'report problem': 'open_report_problem',
            'समस्या बताओ': 'open_report_problem',
            'ಸಮಸ್ಯೆ ವರದಿ': 'open_report_problem',
            
            // Animals
            'animals': 'open_animals_list',
            'पशु': 'open_animals_list',
            'ಪ್ರಾಣಿ': 'open_animals_list',
            'livestock': 'open_animals_list',
            'cattle': 'open_animals_list',
            'add animal': 'open_add_animal',
            'पशु बेचो': 'open_add_animal',
            'ಪ್ರಾಣಿ ಮಾರಾಟ': 'open_add_animal',
            
            // Crops
            'crops': 'open_crops_list',
            'फसल': 'open_crops_list',
            'ಬೆಳೆ': 'open_crops_list',
            'harvest': 'open_crops_list',
            'add crop': 'open_add_crop',
            'फसल बेचो': 'open_add_crop',
            'ಬೆಳೆ ಮಾರಾಟ': 'open_add_crop',
            
            // Stock/Market
            'stock': 'open_stock',
            'बाज़ार': 'open_stock',
            'ಮಾರುಕಟ್ಟೆ': 'open_stock',
            'market': 'open_stock',
            'supplies': 'open_stock',
            'seeds': 'open_stock',
            'fertilizer': 'open_stock',
            
            // Veterinary
            'vet': 'open_tele_vet',
            'doctor': 'open_tele_vet',
            'डॉक्टर': 'open_tele_vet',
            'ವೈದ್ಯ': 'open_tele_vet',
            'animal health': 'open_tele_vet',
            'call vet': 'open_start_vet_call',
            'call doctor': 'open_start_vet_call',
            'वेट कॉल': 'open_start_vet_call',
            
            // Authentication
            'login': 'open_login',
            'लॉगिन': 'open_login',
            'ಲಾಗಿನ್': 'open_login',
            'register': 'open_register',
            'पंजीकरण': 'open_register',
            'ನೋಂದಣಿ': 'open_register',
            'profile': 'open_profile',
            'प्रोफाइल': 'open_profile',
            'ಪ್ರೊಫೈಲ್': 'open_profile',
            
            // Government Schemes
            'schemes': 'open_schemes',
            'योजना': 'open_schemes',
            'ಯೋಜನೆ': 'open_schemes',
            'subsidies': 'open_schemes',
            'benefits': 'open_schemes',
            'government': 'open_schemes',
            
            // AI
            'ai': 'open_ai_assistant',
            'एआई': 'open_ai_assistant',
            'ಎಐ': 'open_ai_assistant',
            'assistant': 'open_ai_assistant',
            'chatbot': 'open_ai_assistant',
            'ask': 'open_ai_assistant',
            
            // Calls
            'calls': 'open_farmer_call_list',
            'कॉल': 'open_farmer_call_list',
            'ಕರೆ': 'open_farmer_call_list',
        };
    }

    /**
     * Initialize regex patterns for fuzzy matching
     * Useful for partial or misspelled voice commands
     */
    initializePatterns() {
        return [
            {
                pattern: /home|मुखपृष्ठ|ಮುಖಪುಟ|go.*home|जाओ|ಹೋಗು/i,
                intent: 'open_home'
            },
            {
                pattern: /dashboard|डैशबोर्ड|ಡ್ಯಾಶ್/i,
                intent: 'open_farmer_dashboard'
            },
            {
                pattern: /community|समुदाय|ಸಮುದಾಯ|feed|posts|पोस्ट/i,
                intent: 'open_community'
            },
            {
                pattern: /chat|चैट|ಚಾಟ್|message|talk|बात/i,
                intent: 'open_chat'
            },
            {
                pattern: /problem|समस्या|ಸಮಸ್ಯೆ|issue|help|मदद|ಸಹಾಯ/i,
                intent: 'open_problems'
            },
            {
                pattern: /animal|पशु|ಪ್ರಾಣಿ|livestock|cattle|गाय|ಗೋ/i,
                intent: 'open_animals_list'
            },
            {
                pattern: /crop|फसल|ಬೆಳೆ|harvest|farming|खेती|ಚಷ್ಟೆ/i,
                intent: 'open_crops_list'
            },
            {
                pattern: /stock|बाज़ार|ಮಾರುಕಟ್ಟೆ|market|buy|sell|खरीद|ಮಾರುಕಟ್ಟೆ/i,
                intent: 'open_stock'
            },
            {
                pattern: /vet|doctor|डॉक्टर|ವೈದ್ಯ|veterinary|animal.*health|जानवर.*स्वास्थ्य/i,
                intent: 'open_tele_vet'
            },
            {
                pattern: /scheme|योजना|ಯೋಜನೆ|subsidy|benefit|सरकार|ಸರ್ಕಾರ/i,
                intent: 'open_schemes'
            },
            {
                pattern: /ai|assistant|एआई|ಎಐ|chatbot|ask|question|सवाल|ಪ್ರಶ್ನೆ/i,
                intent: 'open_ai_assistant'
            }
        ];
    }

    /**
     * Normalize voice input - remove extra spaces, standardize text
     */
    normalizeInput(text) {
        if (!text) return '';
        return text
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[,;:!?]/g, '');
    }

    /**
     * Try to match command using aliases (fast path)
     */
    matchAlias(normalizedText) {
        const words = normalizedText.split(' ');
        
        for (const word of words) {
            if (this.commandAliases[word]) {
                return {
                    matched: true,
                    intent: this.commandAliases[word],
                    method: 'alias',
                    confidence: 0.95
                };
            }
        }

        // Try phrase matching
        for (const [alias, intent] of Object.entries(this.commandAliases)) {
            if (normalizedText.includes(alias)) {
                return {
                    matched: true,
                    intent,
                    method: 'phrase',
                    confidence: 0.9
                };
            }
        }

        return { matched: false };
    }

    /**
     * Try to match command using regex patterns
     */
    matchPattern(text) {
        for (const { pattern, intent } of this.patterns) {
            if (pattern.test(text)) {
                return {
                    matched: true,
                    intent,
                    method: 'pattern',
                    confidence: 0.85
                };
            }
        }
        return { matched: false };
    }

    /**
     * Process voice command - returns intent or null if needs AI processing
     */
    processCommand(query, language = 'en') {
        if (!query || typeof query !== 'string') {
            return null;
        }

        const normalized = this.normalizeInput(query);
        
        // Try alias matching (fastest)
        const aliasMatch = this.matchAlias(normalized);
        if (aliasMatch.matched) {
            log(`Alias match: "${query}" → ${aliasMatch.intent} (confidence: ${aliasMatch.confidence})`);
            this.recordCommand(aliasMatch.intent, query);
            return aliasMatch;
        }

        // Try pattern matching
        const patternMatch = this.matchPattern(normalized);
        if (patternMatch.matched) {
            log(`Pattern match: "${query}" → ${patternMatch.intent} (confidence: ${patternMatch.confidence})`);
            this.recordCommand(patternMatch.intent, query);
            return patternMatch;
        }

        // No match - needs AI processing
        log(`No fast match for: "${query}" - will use AI`);
        return null;
    }

    /**
     * Record command in session history for context
     */
    recordCommand(intent, originalQuery) {
        this.context.lastIntent = intent;
        this.context.sessionCommands.push({
            intent,
            query: originalQuery,
            timestamp: new Date().toISOString()
        });

        // Keep last 10 commands
        if (this.context.sessionCommands.length > 10) {
            this.context.sessionCommands.shift();
        }
    }

    /**
     * Get command history for debugging/analytics
     */
    getCommandHistory() {
        return this.context.sessionCommands;
    }

    /**
     * Extract entities from voice query (e.g., crop name, animal type)
     * Useful for contextual navigation
     */
    extractEntities(query) {
        const entities = {
            action: null,
            target: null,
            modifiers: []
        };

        const words = this.normalizeInput(query).split(' ');
        
        // Simple entity extraction
        if (words[0] === 'show' || words[0] === 'open') {
            entities.action = 'show';
            entities.target = words.slice(1).join(' ');
        } else if (words[0] === 'add' || words[0] === 'create' || words[0] === 'new') {
            entities.action = 'create';
            entities.target = words.slice(1).join(' ');
        } else if (words[0] === 'call' || words[0] === 'contact') {
            entities.action = 'contact';
            entities.target = words.slice(1).join(' ');
        }

        return entities;
    }

    /**
     * Get confidence score for command match
     * Higher = more confident
     */
    getConfidenceScore(query, intent) {
        const normalized = this.normalizeInput(query);
        
        // Perfect match
        if (this.commandAliases[normalized] === intent) {
            return 0.95;
        }

        // Word match
        if (normalized.includes(Object.keys(this.commandAliases).find(k => this.commandAliases[k] === intent))) {
            return 0.85;
        }

        // Pattern match
        const pattern = this.patterns.find(p => p.intent === intent);
        if (pattern && pattern.pattern.test(normalized)) {
            return 0.75;
        }

        return 0.5;
    }

    /**
     * Clear session context
     */
    clearContext() {
        this.context = {
            lastIntent: null,
            lastRoute: null,
            sessionCommands: []
        };
    }
}

// Export as singleton
module.exports = new VoiceCommandHelper();
