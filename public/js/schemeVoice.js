// Scheme-specific voice features
(function () {
    window.SchemeVoice = {
        // Speak scheme name and description
        speakScheme: function(schemeName, schemeDesc) {
            const text = `${schemeName}. ${schemeDesc}`;
            if (window.voiceSpeak) {
                window.voiceSpeak(text);
            }
        },

        // Read all schemes on page
        readAllSchemes: function() {
            const cards = document.querySelectorAll('.scheme-card');
            if (cards.length === 0) {
                window.voiceSpeak("No schemes found");
                return;
            }

            let schemeList = "Reading all available schemes. ";
            cards.forEach((card, index) => {
                const name = card.querySelector('h3')?.textContent || '';
                const desc = card.querySelector('p')?.textContent || '';
                schemeList += `${index + 1}. ${name}. ${desc}. `;
            });

            if (window.voiceSpeak) {
                window.voiceSpeak(schemeList);
            }
        },

        // Stop any ongoing speech
        stopReading: function() {
            if (window.voiceStop) {
                window.voiceStop();
            }
        },

        // Toggle voice on/off
        toggleVoice: function(state) {
            if (window.voiceToggle) {
                window.voiceToggle(state);
            }
        },

        // Change voice language
        changeLanguage: function(lang) {
            if (window.voiceSetLang) {
                window.voiceSetLang(lang);
            }
            // Announce language change
            const langMap = {
                'en': 'English',
                'hi': 'Hindi',
                'kn': 'Kannada'
            };
            const langName = langMap[lang] || lang;
            if (window.voiceSpeak) {
                window.voiceSpeak(`Language changed to ${langName}`);
            }
        },

        // Read filter information
        speakFilter: function(filterType) {
            const filterNames = {
                'all': 'Showing all schemes',
                'All India': 'Showing central government schemes',
                'Karnataka': 'Showing Karnataka state schemes',
                'Income Support': 'Showing income support schemes',
                'Insurance': 'Showing insurance schemes'
            };
            
            const message = filterNames[filterType] || `Showing ${filterType} schemes`;
            if (window.voiceSpeak) {
                window.voiceSpeak(message);
            }
        },

        // Read search results count
        speakSearchResults: function(count) {
            const message = count === 0 
                ? "No schemes found. Try different search terms."
                : `Found ${count} scheme${count !== 1 ? 's' : ''}. `;
            
            if (window.voiceSpeak) {
                window.voiceSpeak(message);
            }
        }
    };

    // Initialize voice controls when document is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Add voice control buttons
        addVoiceControls();
    });

    // Function to add voice control UI
    function addVoiceControls() {
        // Check if controls already exist
        if (document.getElementById('schemeVoiceControls')) return;

        const voiceControlHTML = `
            <div id="schemeVoiceControls" class="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
                <button 
                    id="readAllSchemesBtn" 
                    class="bg-green-600 hover:bg-green-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
                    title="Read all schemes aloud"
                    onclick="SchemeVoice.readAllSchemes()">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.5A3.5 3.5 0 008.5 18H12a3.5 3.5 0 003.5-3.5V3z"></path>
                    </svg>
                </button>
                <button 
                    id="stopVoiceBtn" 
                    class="bg-red-600 hover:bg-red-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
                    title="Stop reading"
                    onclick="SchemeVoice.stopReading()">
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

    // Make the scheme voice functions globally available
    window.readAllSchemes = () => SchemeVoice.readAllSchemes();
    window.stopSchemeVoice = () => SchemeVoice.stopReading();
    window.speakScheme = (name, desc) => SchemeVoice.speakScheme(name, desc);

})();
