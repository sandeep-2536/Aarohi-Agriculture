// Dashboard-specific voice features for weather and AI advice
(function () {
    window.DashboardVoice = {
        // Speak weather data
        speakWeather: function() {
            if (!window.weatherRaw || window.weatherRaw.length === 0) {
                window.voiceSpeak("No weather data available");
                return;
            }

            const today = window.weatherRaw[0];
            const text = `Current weather is ${today.temp} degrees, ${today.desc}. `;
            
            if (window.voiceSpeak) {
                window.voiceSpeak(text);
            }
        },

        // Speak AI advice
        speakAdvice: function() {
            const adviceElement = document.querySelector('[data-ai-advice]');
            const adviceText = adviceElement?.textContent || adviceElement?.innerText || 'No advice available';
            
            // Clean HTML tags for voice
            const cleanText = adviceText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            
            if (cleanText && window.voiceSpeak) {
                window.voiceSpeak(cleanText);
            }
        },

        // Speak all dashboard info
        speakAll: function() {
            // Speak welcome
            if (window.voiceSpeak) {
                const userName = document.querySelector('[data-user-name]')?.textContent || 'Farmer';
                window.voiceSpeak(`Welcome to your dashboard, ${userName}`);
            }
            
            // Speak weather
            setTimeout(() => window.DashboardVoice.speakWeather(), 500);
            
            // Speak advice
            setTimeout(() => window.DashboardVoice.speakAdvice(), 2000);
        },

        // Stop any ongoing speech
        stopReading: function() {
            if (window.voiceStop) {
                window.voiceStop();
            }
        },

        // Speak farm stats
        speakStats: function() {
            const stats = [];
            const statElements = document.querySelectorAll('[data-stat-label]');
            
            statElements.forEach(el => {
                const label = el.getAttribute('data-stat-label');
                const value = el.getAttribute('data-stat-value');
                if (label && value) {
                    stats.push(`${value} ${label}`);
                }
            });

            const statsText = "Your farm stats: " + (stats.length > 0 ? stats.join(", ") : "No stats available");
            
            if (window.voiceSpeak) {
                window.voiceSpeak(statsText);
            }
        },

        // Change language
        changeLanguage: function(lang) {
            if (window.voiceSetLang) {
                window.voiceSetLang(lang);
            }
            
            const langMap = {
                'en': 'English',
                'hi': 'Hindi',
                'kn': 'Kannada'
            };
            const langName = langMap[lang] || lang;
            
            if (window.voiceSpeak) {
                window.voiceSpeak(`Language changed to ${langName}`);
            }
            
            // Reload page with new language
            window.location.href = window.location.pathname + '?lang=' + lang;
        }
    };

    // Initialize voice controls when document is ready
    document.addEventListener('DOMContentLoaded', function() {
        addDashboardVoiceControls();
        setupWeatherData();
    });

    // Store weather data for voice access
    function setupWeatherData() {
        window.weatherRaw = [];
        const weatherItems = document.querySelectorAll('[data-weather-temp]');
        
        weatherItems.forEach(item => {
            const temp = item.getAttribute('data-weather-temp');
            const desc = item.getAttribute('data-weather-desc');
            const date = item.getAttribute('data-weather-date');
            
            window.weatherRaw.push({
                temp: temp,
                desc: desc,
                date: date
            });
        });
    }

    // Function to add voice control UI
    function addDashboardVoiceControls() {
        // Check if controls already exist
        if (document.getElementById('dashboardVoiceControls')) return;

        const voiceControlHTML = `
            <div id="dashboardVoiceControls" class="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
                <button 
                    id="readAllBtn" 
                    class="bg-green-600 hover:bg-green-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
                    title="Read all dashboard information"
                    onclick="DashboardVoice.speakAll()">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.5A3.5 3.5 0 008.5 18H12a3.5 3.5 0 003.5-3.5V3z"></path>
                    </svg>
                </button>
                <button 
                    id="readWeatherBtn" 
                    class="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
                    title="Read weather information"
                    onclick="DashboardVoice.speakWeather()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.052A4.001 4.001 0 003 15z"></path>
                    </svg>
                </button>
                <button 
                    id="readAdviceBtn" 
                    class="bg-purple-600 hover:bg-purple-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
                    title="Read AI advice"
                    onclick="DashboardVoice.speakAdvice()">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                </button>
                <button 
                    id="stopVoiceBtn" 
                    class="bg-red-600 hover:bg-red-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
                    title="Stop reading"
                    onclick="DashboardVoice.stopReading()">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `;

        // Insert voice controls before footer or at end of body
        const footer = document.querySelector('footer');
        if (footer) {
            footer.insertAdjacentHTML('beforebegin', voiceControlHTML);
        } else {
            document.body.insertAdjacentHTML('beforeend', voiceControlHTML);
        }
    }

    // Make the dashboard voice functions globally available
    window.speakDashboardAll = () => DashboardVoice.speakAll();
    window.speakDashboardWeather = () => DashboardVoice.speakWeather();
    window.speakDashboardAdvice = () => DashboardVoice.speakAdvice();
    window.stopDashboardVoice = () => DashboardVoice.stopReading();
    window.changeDashboardLanguage = (lang) => DashboardVoice.changeLanguage(lang);

})();
