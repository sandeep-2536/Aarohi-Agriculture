const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require('../models/User');
const Post = require('../models/Post'); 
// ... Import other models (Animal, Crop, Problem, etc.)

require('dotenv').config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

exports.getDashboard = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect("/auth/login");
        const userId = (req.session.user && req.session.user._id) || null;
        
        // Get current language from query, cookie, or default to 'en'
        const lang = req.query.lang || req.cookies.aarohi_lang || 'en';
        
        // Prefer fresh DB copy when possible, fall back to session user object
        let user = req.session.user;
        if (userId) {
            try {
                const dbUser = await User.findById(userId);
                if (dbUser) user = dbUser;
            } catch (e) {
                console.warn('[dashboard] could not load user from DB, using session user');
            }
        }

        // ==========================================
        // 1. YOUR EXISTING DATA LOGIC
        // ==========================================
        const myCommunityPosts = await Post.find({ author: userId }); 
        const myComments = []; // Replace with actual query
        const myProblems = []; // Replace with actual query
        const myAnimals = [];  // Replace with actual query
        const myCrops = [];    // Replace with actual query
        const myVetCalls = []; // Replace with actual query
        const myAISearches = []; 
        const myStockViews = [];
        const recentActivity = []; 

        // ==========================================
        // 2. WEATHER & AI LOGIC (FIXED WITH LANGUAGE SUPPORT)
        // ==========================================
        let weatherData = null;
        let aiAdvice = "Currently, no advice is available. Please update your location.";

        // Location fallback chain
        const locationQuery = (user && (user.village || user.city || user.district || user.state)) || process.env.DEFAULT_WEATHER_CITY || "Delhi";

        // Get API key
        const apiKey = process.env.WEATHER_API_KEY || process.env.OPENWEATHERMAP_API_KEY;
        console.log('[dashboard] locationQuery=', locationQuery, 'lang=', lang, 'apiKeyPresent=', !!apiKey);

        if (locationQuery && apiKey) {
            try {
                // A. Fetch Weather from OpenWeatherMap
                const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(locationQuery)}&units=metric&appid=${apiKey}`;
                console.log('[dashboard] Fetching weather from:', weatherUrl);
                
                const response = await axios.get(weatherUrl);
                const list = response.data && response.data.list ? response.data.list : null;
                
                if (!list || list.length === 0) {
                    throw new Error('Invalid weather response - empty list');
                }

                // B. Simplify Data (Take 1 reading per day at 12:00 PM)
                weatherData = list
                    .filter(reading => reading.dt_txt.includes("12:00:00"))
                    .slice(0, 5)
                    .map(day => ({
                        date: new Date(day.dt_txt).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
                        temp: Math.round(day.main.temp),
                        icon: day.weather[0].icon,
                        desc: day.weather[0].main
                    }));

                console.log('[dashboard] Weather data processed:', weatherData.length, 'days');

                // C. Ask AI for Advice (WITH LANGUAGE SUPPORT)
                if (process.env.AI_API_KEY) {
                    try {
                        // Language-specific prompt instructions
                        let langInstruction = "English";
                        let responseFormat = "English";
                        
                        if (lang === 'hi') {
                            langInstruction = "Hindi (हिंदी)";
                            responseFormat = "Hindi";
                        } else if (lang === 'kn') {
                            langInstruction = "Kannada (ಕನ್ನಡ)";
                            responseFormat = "Kannada";
                        }

                        const prompt = `
                            I am a farmer in ${locationQuery}. 
                            The weather forecast for the next 5 days is: ${JSON.stringify(weatherData)}.
                            
                            Please respond ONLY in ${langInstruction}.
                            
                            Based strictly on this weather, provide:
                            1. A 1-sentence warning or green flag.
                            2. A bullet list (<ul><li>) of 3 actionable tasks (e.g., "Irrigate tomorrow", "Spray fungicide").
                            
                            Format the response as raw HTML without markdown code blocks.
                            Language: ${responseFormat}
                        `;
                        
                        const aiResult = await model.generateContent(prompt);
                        aiAdvice = aiResult.response.text();
                        console.log('[dashboard] AI advice generated successfully in', langInstruction);
                    } catch (aiErr) {
                        console.error('[dashboard] AI generation failed:', aiErr.message);
                        aiAdvice = `Weather: ${weatherData[0].desc}, ${weatherData[0].temp}°C. Check forecast for field planning.`;
                    }
                } else {
                    aiAdvice = `Weather: ${weatherData[0].desc}, ${weatherData[0].temp}°C. AI API key not configured.`;
                }

            } catch (err) {
                console.error("[dashboard] Weather/AI Error:", err.message);
                
                // Check if it's a 404 (location not found)
                if (err.response && err.response.status === 404) {
                    console.warn('[dashboard] Location not found:', locationQuery);
                    
                    // Try fallback to state
                    const fallbackLocation = user && user.state ? user.state : process.env.DEFAULT_WEATHER_CITY || 'Delhi';
                    console.log('[dashboard] Trying fallback location:', fallbackLocation);
                    
                    try {
                        const fallbackRes = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(fallbackLocation)}&units=metric&appid=${apiKey}`);
                        const fallbackList = fallbackRes.data && fallbackRes.data.list ? fallbackRes.data.list : [];
                        
                        weatherData = fallbackList
                            .filter(reading => reading.dt_txt.includes("12:00:00"))
                            .slice(0, 5)
                            .map(day => ({
                                date: new Date(day.dt_txt).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
                                temp: Math.round(day.main.temp),
                                icon: day.weather[0].icon,
                                desc: day.weather[0].main
                            }));
                        
                        aiAdvice = `Weather data for ${fallbackLocation} region. Please enter a valid village/city name in your profile for more accurate forecasts.`;
                        console.log('[dashboard] Fallback weather loaded successfully');
                    } catch (fallbackErr) {
                        console.error('[dashboard] Fallback location also failed:', fallbackErr.message);
                        aiAdvice = `Could not fetch weather for "${locationQuery}". Please check the village/city name in your profile.`;
                    }
                } else {
                    // Other API errors
                    aiAdvice = "Could not fetch weather advice at this moment. Please try again later.";
                }
            }
        } else {
            if (!apiKey) {
                console.warn('[dashboard] API key missing (WEATHER_API_KEY or OPENWEATHERMAP_API_KEY)');
                aiAdvice = "Weather service not configured on server. Please contact administrator.";
            } else {
                aiAdvice = "Location not set. Update your profile with a village or state to get weather-based advice.";
            }
        }

        // ==========================================
        // 3. RENDER THE DASHBOARD
        // ==========================================
        console.log('[dashboard] Rendering with weather:', !!weatherData, 'advice:', !!aiAdvice, 'lang:', lang);
        
        res.render('dashboard/dashboard', {
            // User Data
            user: user,
            
            // Language
            lang: lang,
            
            // Weather Feature Data
            weather: weatherData,
            aiAdvice: aiAdvice,

            // Existing Feature Data
            myCommunityPosts,
            myComments,
            myProblems,
            myAnimals,
            myCrops,
            myVetCalls,
            myAISearches,
            myStockViews,
            recentActivity
        });

    } catch (error) {
        console.error("[dashboard] Controller Error:", error);
        res.status(500).send("Server Error: " + error.message);
    }
};

// NEW: Save Location Endpoint (called from dashboard modal)
exports.saveLocation = async (req, res) => {
    try {
        const { village, state } = req.body;
        const userId = req.session.user?._id;
        
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        // Update user in database
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { village, state },
            { new: true }
        );

        // Update session
        req.session.user = updatedUser;

        console.log('[dashboard] Location saved:', { village, state });
        
        res.json({ 
            success: true, 
            message: 'Location saved successfully',
            user: { village: updatedUser.village, state: updatedUser.state }
        });
    } catch (error) {
        console.error('[dashboard] Save location error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};