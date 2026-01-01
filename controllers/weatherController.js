const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require('../models/User');

require('dotenv').config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

exports.getWeatherPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect("/auth/login");
        const userId = req.session.user._id;
        
        // Get fresh user data from DB
        let user = req.session.user;
        try {
            const dbUser = await User.findById(userId);
            if (dbUser) user = dbUser;
        } catch (e) {
            console.warn('[weather] Could not load user from DB');
        }

        // Location fallback chain
        let locationQuery = (user && (user.village || user.city || user.district || user.state)) ||
                              process.env.DEFAULT_WEATHER_CITY || "Delhi";

        // If browser provided coordinates via query string, use reverse geocoding to get a location name
        const { lat, lon } = req.query || {};
        const apiKey = process.env.WEATHER_API_KEY || process.env.OPENWEATHERMAP_API_KEY;
        if (lat && lon && apiKey) {
            try {
                const geoUrl = `http://api.openweathermap.org/geo/1.0/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=1&appid=${apiKey}`;
                const geoRes = await axios.get(geoUrl);
                if (Array.isArray(geoRes.data) && geoRes.data.length > 0) {
                    const place = geoRes.data[0];
                    // prefer city name, fallback to name field
                    locationQuery = place.name || `${place.local_names?.en || ''}` || locationQuery;
                    console.log('[weather] Reverse geocoded coordinates to:', locationQuery);
                }
            } catch (geoErr) {
                console.warn('[weather] Reverse geocode failed:', geoErr.message);
            }
        }
        
        
        let weatherData = null;
        let detailedForecast = [];
        let currentWeather = null;
        let aiAdvice = "Weather service temporarily unavailable.";
        let locationName = locationQuery;

        console.log('[weather] Fetching weather for:', locationQuery);

        if (locationQuery && apiKey) {
            try {
                // Fetch detailed 5-day forecast (40 readings, every 3 hours)
                const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(locationQuery)}&units=metric&appid=${apiKey}`;
                const forecastRes = await axios.get(forecastUrl);
                
                // Fetch current weather
                const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(locationQuery)}&units=metric&appid=${apiKey}`;
                const currentRes = await axios.get(currentUrl);

                // Store location name from API response
                locationName = currentRes.data.name;

                // Process current weather
                currentWeather = {
                    temp: Math.round(currentRes.data.main.temp),
                    feelsLike: Math.round(currentRes.data.main.feels_like),
                    humidity: currentRes.data.main.humidity,
                    windSpeed: Math.round(currentRes.data.wind.speed * 3.6), // m/s to km/h
                    pressure: currentRes.data.main.pressure,
                    description: currentRes.data.weather[0].description,
                    main: currentRes.data.weather[0].main,
                    icon: currentRes.data.weather[0].icon,
                    sunrise: new Date(currentRes.data.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    sunset: new Date(currentRes.data.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                };

                // Process 5-day forecast (1 per day at noon)
                const list = forecastRes.data.list;
                weatherData = list
                    .filter(reading => reading.dt_txt.includes("12:00:00"))
                    .slice(0, 5)
                    .map(day => ({
                        date: new Date(day.dt_txt).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
                        temp: Math.round(day.main.temp),
                        tempMin: Math.round(day.main.temp_min),
                        tempMax: Math.round(day.main.temp_max),
                        icon: day.weather[0].icon,
                        desc: day.weather[0].main,
                        humidity: day.main.humidity,
                        windSpeed: Math.round(day.wind.speed * 3.6)
                    }));

                // Process detailed hourly forecast (next 24 hours)
                detailedForecast = list.slice(0, 8).map(reading => ({
                    time: new Date(reading.dt_txt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    temp: Math.round(reading.main.temp),
                    icon: reading.weather[0].icon,
                    desc: reading.weather[0].description,
                    humidity: reading.main.humidity,
                    windSpeed: Math.round(reading.wind.speed * 3.6),
                    pop: Math.round(reading.pop * 100) // Probability of precipitation
                }));

                // Generate comprehensive AI advice
                if (process.env.AI_API_KEY) {
                    try {
                        const prompt = `
                            I am a farmer in ${locationName}.
                            Current weather: ${currentWeather.main}, ${currentWeather.temp}°C, Humidity: ${currentWeather.humidity}%
                            5-day forecast: ${JSON.stringify(weatherData)}
                            
                            Provide detailed farming advice in HTML format:
                            1. Overall weather assessment (2-3 sentences)
                            2. <h4>Today's Tasks</h4> with a <ul> list of 3-4 specific actions
                            3. <h4>Week Ahead</h4> with a <ul> list of 3-4 planning points
                            4. <h4>Crop Care Tips</h4> with a <ul> list of 2-3 weather-specific tips
                            
                            Use clean HTML with <h4>, <ul>, <li> tags. No markdown.
                        `;
                        
                        const aiResult = await model.generateContent(prompt);
                        aiAdvice = aiResult.response.text();
                        console.log('[weather] AI advice generated');
                    } catch (aiErr) {
                        console.error('[weather] AI error:', aiErr.message);
                        aiAdvice = `<p>Current conditions: ${currentWeather.description}. Temperature: ${currentWeather.temp}°C with ${currentWeather.humidity}% humidity.</p>`;
                    }
                }

            } catch (err) {
                console.error('[weather] API Error:', err.message);
                
                // Fallback handling
                if (err.response && err.response.status === 404) {
                    const fallbackLocation = user.state || 'Delhi';
                    console.log('[weather] Trying fallback:', fallbackLocation);
                    
                    try {
                        const fallbackRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(fallbackLocation)}&units=metric&appid=${apiKey}`);
                        currentWeather = {
                            temp: Math.round(fallbackRes.data.main.temp),
                            feelsLike: Math.round(fallbackRes.data.main.feels_like),
                            humidity: fallbackRes.data.main.humidity,
                            windSpeed: Math.round(fallbackRes.data.wind.speed * 3.6),
                            pressure: fallbackRes.data.main.pressure,
                            description: fallbackRes.data.weather[0].description,
                            main: fallbackRes.data.weather[0].main,
                            icon: fallbackRes.data.weather[0].icon,
                            sunrise: new Date(fallbackRes.data.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                            sunset: new Date(fallbackRes.data.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        };
                        locationName = fallbackLocation;
                        aiAdvice = `<p>Showing weather for ${fallbackLocation} region. Update your profile with a specific village/city for accurate local weather.</p>`;
                    } catch (fallbackErr) {
                        aiAdvice = `<p>Unable to fetch weather for "${locationQuery}". Please update your location in profile settings.</p>`;
                    }
                } else {
                    aiAdvice = `<p>Weather service temporarily unavailable. Please try again later.</p>`;
                }
            }
        } else {
            if (!apiKey) {
                aiAdvice = "<p>Weather service not configured. Please contact support.</p>";
            } else {
                aiAdvice = "<p>Please set your location in profile to view weather updates.</p>";
            }
        }

        // Render dedicated weather page
        res.render('weather/weather', {
            user,
            locationName,
            currentWeather,
            weatherData,
            detailedForecast,
            aiAdvice
        });

    } catch (error) {
        console.error('[weather] Controller Error:', error);
        res.status(500).send('Weather service error: ' + error.message);
    }
};