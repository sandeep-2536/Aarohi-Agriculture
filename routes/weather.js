// routes/weather.js

const express = require('express');
const router = express.Router();

// NOTE: You must import fetch and the API key here or pass them in a context object, 
// but for simplicity, we'll assume they are defined globally or imported.
// In a real app, you'd pass WEATHER_API_KEY from your main app.
// For this example, we'll define the key and require fetch (assuming it's installed or Node version supports it)
const WEATHER_API_KEY = process.env.WEATHER_API; // Defined here for now
// const fetch = require('node-fetch'); // You need to uncomment/install node-fetch or use native fetch if available

/* GET /features/weather - Render the weather page */
router.get('/', async (req, res) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
        return res.render('weather', { weather: null });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (response.ok) {
            res.render('weather', { weather: data });
        } else {
            res.render('weather', { weather: null });
        }
    } catch (err) {
        console.error(err);
        res.render('weather', { weather: null });
    }
});

/* POST /api/weather - Fetch weather data via API */
router.post('/api', async (req, res) => {
    const { lat, lon } = req.body;
    if (!lat || !lon) return res.status(400).json({ error: 'Missing latitude or longitude' });

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (response.ok) {
            res.json(data);
        } else {
            res.status(response.status).json({ error: data.message || 'Failed to fetch weather data' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;