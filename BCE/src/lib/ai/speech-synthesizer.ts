export interface SpeakOptions {
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

/**
 * Checks if SpeechSynthesis browser API is available.
 */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/**
 * Strips markdown symbols, raw URLs, JSON action badges, and formatting 
 * so spoken output sounds like a natural, fluent human assistant.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Remove action buttons JSON payload if present e.g. [ACTION_BUTTONS: ...]
  cleaned = cleaned.replace(/\[ACTION_BUTTONS:\s*[\s\S]*?\]/gi, '');

  // 2. Remove URLs (http://, https://, www.)
  cleaned = cleaned.replace(/https?:\/\/\S+/gi, '');
  cleaned = cleaned.replace(/www\.\S+/gi, '');

  // 3. Remove Markdown headings (###, ##, #)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

  // 4. Remove bold & italic markup (**text**, *text*, __text__, _text_)
  cleaned = cleaned.replace(/(\*\*|__|\*|_)(.*?)\1/g, '$2');

  // 5. Remove inline code backticks (`code`)
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // 6. Clean bullet points & numbered lists
  cleaned = cleaned.replace(/^[•*\-\d+\.]\s*/gm, '');

  // 7. Remove emoji symbols that clutter speech reading
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');

  // 8. Normalize multiple spaces & newlines to natural pauses
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Detects whether transcript/response is primarily Hinglish/Hindi ('hi-IN') or Indian English ('en-IN').
 */
export function detectLanguage(text: string): 'hi-IN' | 'en-IN' {
  const p = text.toLowerCase();
  const hinglishMarkers = [
    'bhai', 'kholo', 'karo', 'kar', 'hoon', 'hai', 'hain', 'dikhao', 'mera', 'meri',
    'tumhari', 'par', 'pe', 'kya', 'sawal', 'banao', 'hisaab', 'bilkul', 'raha', 'rahi',
    'kuch', 'kaise', 'sabse', 'padhna', 'karna', 'liye', 'haan'
  ];

  const matchCount = hinglishMarkers.reduce((count, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(p) ? count + 1 : count;
  }, 0);

  return matchCount >= 1 ? 'hi-IN' : 'en-IN';
}

let currentUtterance: SpeechSynthesisUtterance | null = null;
let activeEndCallback: (() => void) | null = null;

/**
 * Stops any active Text-to-Speech playback immediately.
 */
export function stopAssistantSpeech() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();
  } catch (err) {
    console.warn('SpeechSynthesis cancel error:', err);
  }

  currentUtterance = null;
  if (activeEndCallback) {
    const cb = activeEndCallback;
    activeEndCallback = null;
    cb();
  }
}

/**
 * Speaks the assistant response text aloud.
 * Returns true if speech was initiated, false if unsupported or empty text.
 */
export function speakAssistantResponse(text: string, options: SpeakOptions = {}): boolean {
  if (!isSpeechSynthesisSupported()) {
    if (options.onError) {
      options.onError(new Error('Speech synthesis is not supported in this browser.'));
    }
    return false;
  }

  // Cancel any ongoing speech first (Interruptible speech)
  stopAssistantSpeech();

  const spokenText = cleanTextForSpeech(text);
  if (!spokenText) {
    if (options.onEnd) options.onEnd();
    return false;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(spokenText);
    currentUtterance = utterance;
    activeEndCallback = options.onEnd || null;

    // Detect language or use provided lang option (defaulting to en-IN / hi-IN)
    const targetLang = options.lang || detectLanguage(spokenText);
    utterance.lang = targetLang;
    utterance.rate = 0.95; // Slightly slower for clear, natural Indian speech cadence
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Attempt to pick best matching voice from available system voices (preferring en-IN / hi-IN)
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const preferredVoice = voices.find(v => {
        const langStr = v.lang.toLowerCase().replace('_', '-');
        const nameStr = v.name.toLowerCase();
        
        if (targetLang === 'hi-IN') {
          return langStr.includes('hi') || langStr.includes('hi-in') || nameStr.includes('hindi') || nameStr.includes('india');
        }
        return langStr.includes('en-in') || nameStr.includes('india') || nameStr.includes('indian') || nameStr.includes('en_in');
      }) || voices.find(v => v.lang.toLowerCase().includes('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    utterance.onstart = () => {
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      currentUtterance = null;
      if (activeEndCallback) {
        const cb = activeEndCallback;
        activeEndCallback = null;
        cb();
      }
    };

    utterance.onerror = (event) => {
      console.warn('Speech synthesis playback error:', event);
      currentUtterance = null;
      activeEndCallback = null;
      if (options.onError) {
        options.onError(event);
      }
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Failed to initialize SpeechSynthesisUtterance:', err);
    if (options.onError) {
      options.onError(err);
    }
    return false;
  }
}
