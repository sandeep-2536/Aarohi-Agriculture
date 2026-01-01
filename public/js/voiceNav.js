// public/js/voiceNav.js - Advanced Voice Navigation Engine

class VoiceNavigationEngine {
  constructor() {
    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[VoiceNav] Speech Recognition not supported');
      this.supported = false;
      return;
    }

    this.supported = true;
    this.recognition = new SpeechRecognition();
    this.setupRecognition();
    
    // State management
    this.isListening = false;
    this.currentLanguage = this.getLanguage();
    this.commandHistory = [];
    this.maxHistory = 10;
    
    // UI Elements
    this.voiceBtn = document.getElementById("voiceBtn");
    this.init();
  }

  setupRecognition() {
    // Language configuration
    this.recognition.lang = this.getLanguageCode();
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    this.recognition.continuous = false;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateVoiceBtn('listening');
      console.log('[VoiceNav] Listening started in', this.currentLanguage);
    };

    this.recognition.onresult = async (event) => {
      let transcript = '';
      
      // Collect all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const current = event.results[i][0].transcript;
        transcript += current + ' ';
        
        if (event.results[i].isFinal) {
          console.log('[VoiceNav] Final transcript:', transcript.trim());
          await this.handleVoiceCommand(transcript.trim());
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('[VoiceNav] Error:', event.error);
      this.updateVoiceBtn('error');
      this.showErrorMessage(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateVoiceBtn('idle');
      console.log('[VoiceNav] Listening ended');
    };
  }

  init() {
    if (!this.voiceBtn) return;

    // Voice button click handler
    this.voiceBtn.addEventListener('click', () => {
      if (this.isListening) {
        this.stop();
      } else {
        this.start();
      }
    });

    // Keyboard shortcut (hold spacebar for voice)
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.isListening && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        this.start();
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && this.isListening) {
        this.stop();
      }
    });

    // Language change listener
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        this.currentLanguage = e.target.value;
        this.recognition.lang = this.getLanguageCode();
        console.log('[VoiceNav] Language changed to:', this.currentLanguage);
      });
    }
  }

  getLanguage() {
    return localStorage.getItem('aarohi_lang') || 'en';
  }

  getLanguageCode() {
    const langMap = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'kn': 'kn-IN'
    };
    return langMap[this.currentLanguage] || 'en-IN';
  }

  start() {
    if (this.isListening || !this.supported) return;
    try {
      this.recognition.start();
    } catch (err) {
      console.error('[VoiceNav] Start error:', err);
    }
  }

  stop() {
    try {
      this.recognition.stop();
    } catch (err) {
      console.error('[VoiceNav] Stop error:', err);
    }
  }

  async handleVoiceCommand(transcript) {
    try {
      // Add to history
      this.commandHistory.push({
        text: transcript,
        timestamp: new Date(),
        language: this.currentLanguage
      });
      
      if (this.commandHistory.length > this.maxHistory) {
        this.commandHistory.shift();
      }

      console.log('[VoiceNav] Processing command:', transcript);
      this.showStatus('Processing...', 'processing');

      // Send to server with language context
      const response = await fetch('/voice/navigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: transcript,
          language: this.currentLanguage,
          context: {
            currentPath: window.location.pathname,
            userAgent: 'voice'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.route) {
        this.showStatus('Navigating...', 'success');
        console.log('[VoiceNav] Navigating to:', data.route);
        
        // Give user time to see feedback
        setTimeout(() => {
          window.location.href = data.route;
        }, 500);
      } else {
        this.showStatus('Could not understand. Try again.', 'warning');
        console.warn('[VoiceNav] No valid route returned');
      }

    } catch (error) {
      console.error('[VoiceNav] Command handling error:', error);
      this.showStatus('Navigation failed. Try again.', 'error');
      this.updateVoiceBtn('error');
    }
  }

  updateVoiceBtn(state) {
    if (!this.voiceBtn) return;

    const states = {
      idle: { text: '🎤', title: 'Click to speak or press spacebar', class: 'bg-blue-600' },
      listening: { text: '⏹️', title: 'Listening...', class: 'bg-green-600 animate-pulse' },
      processing: { text: '⏳', title: 'Processing...', class: 'bg-yellow-600' },
      error: { text: '❌', title: 'Error. Click to retry.', class: 'bg-red-600' }
    };

    const config = states[state] || states.idle;
    this.voiceBtn.textContent = config.text;
    this.voiceBtn.title = config.title;
    this.voiceBtn.className = `${config.class} hover:opacity-90 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all font-bold text-lg cursor-pointer`;
  }

  showStatus(message, type = 'info') {
    let existing = document.getElementById('voiceStatus');
    if (existing) existing.remove();

    const status = document.createElement('div');
    status.id = 'voiceStatus';
    status.className = `fixed bottom-24 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-white text-sm font-semibold z-50
      ${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : type === 'processing' ? 'bg-blue-600' : 'bg-gray-700'}`;
    status.textContent = message;
    document.body.appendChild(status);

    setTimeout(() => status.remove(), 3000);
  }

  showErrorMessage(error) {
    const messages = {
      'no-speech': 'No speech detected. Try again.',
      'audio-capture': 'Microphone not working. Check permissions.',
      'network': 'Network error. Check connection.',
      'service-not-available': 'Voice service unavailable.',
      'bad-grammar': 'Could not understand. Try speaking clearly.',
      'permission-denied': 'Microphone permission denied.'
    };

    const message = messages[error] || 'Voice error: ' + error;
    this.showStatus(message, 'error');
  }

  getCommandHistory() {
    return this.commandHistory;
  }

  clearHistory() {
    this.commandHistory = [];
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.voiceNav = new VoiceNavigationEngine();
  console.log('[VoiceNav] Engine initialized');
});

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceNavigationEngine;
}
