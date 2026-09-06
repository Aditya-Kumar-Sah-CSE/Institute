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

  // 8. Truncate long explanations for spoken output (keep under 350 chars for natural voice delivery)
  if (cleaned.length > 350) {
    const periodIdx = cleaned.indexOf('.', 180);
    if (periodIdx !== -1 && periodIdx < 350) {
      cleaned = cleaned.slice(0, periodIdx + 1);
    } else {
      cleaned = cleaned.slice(0, 300) + '...';
    }
  }

  // 9. Normalize multiple spaces & newlines to natural pauses
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
    'kuch', 'kaise', 'sabse', 'padhna', 'karna', 'liye', 'haan', 'aaj', 'padh'
  ];

  const matchCount = hinglishMarkers.reduce((count, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(p) ? count + 1 : count;
  }, 0);

  return matchCount >= 1 ? 'hi-IN' : 'en-IN';
}

let currentTtsSessionId = 0;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let activeEndCallback: (() => void) | null = null;
let isSpeechSynthesisActive = false;

/**
 * Returns whether Web Speech API synthesis is currently speaking.
 */
export function getSpeechSynthesisSpeaking(): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  return isSpeechSynthesisActive || window.speechSynthesis.speaking;
}

/**
 * Stops any active Text-to-Speech playback immediately without triggering stale callbacks.
 */
export function stopAssistantSpeech() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  isSpeechSynthesisActive = false;
  // Invalidate current TTS session so any pending utterance callbacks are safely ignored
  currentTtsSessionId++;
  currentUtterance = null;
  activeEndCallback = null;

  try {
    const synth = window.speechSynthesis;
    // Only call cancel() if browser speech synthesis is actively speaking or pending
    if (synth.speaking || synth.pending) {
      synth.cancel();
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[TTS] SpeechSynthesis cancel notice:', err);
    }
  }
}

/**
 * Dynamically selects the best natural browser voice for the target language.
 */
function selectBestVoice(targetLang: 'hi-IN' | 'en-IN'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Try exact language match with natural/Google/Microsoft quality voice
  const exactQuality = voices.find(v => {
    const lang = v.lang.toLowerCase().replace('_', '-');
    const name = v.name.toLowerCase();
    const isLangMatch = targetLang === 'hi-IN' ? (lang.includes('hi') || name.includes('hindi')) : (lang.includes('en-in') || name.includes('india'));
    const isNatural = name.includes('natural') || name.includes('google') || name.includes('neural') || name.includes('premium');
    return isLangMatch && isNatural;
  });

  if (exactQuality) return exactQuality;

  // 2. Try exact language match
  const exactLang = voices.find(v => {
    const lang = v.lang.toLowerCase().replace('_', '-');
    const name = v.name.toLowerCase();
    return targetLang === 'hi-IN' ? (lang.includes('hi') || name.includes('hindi')) : (lang.includes('en-in') || name.includes('india'));
  });

  if (exactLang) return exactLang;

  // 3. Fallback to any English natural voice
  return voices.find(v => v.lang.toLowerCase().includes('en') && (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('natural'))) ||
         voices.find(v => v.lang.toLowerCase().includes('en')) ||
         voices[0];
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

  // Cancel any ongoing speech first and obtain fresh TTS session ID
  stopAssistantSpeech();
  const activeSessionId = ++currentTtsSessionId;

  const spokenText = cleanTextForSpeech(text);
  if (!spokenText) {
    if (options.onEnd) options.onEnd();
    return false;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(spokenText);
    currentUtterance = utterance;
    activeEndCallback = options.onEnd || null;

    const targetLang = options.lang || detectLanguage(spokenText);
    utterance.lang = targetLang;
    utterance.rate = 0.98;   // Natural, warm conversational pace
    utterance.pitch = 1.05;  // Slightly energetic & friendly tone
    utterance.volume = 1.0;

    const selectedVoice = selectBestVoice(targetLang as 'hi-IN' | 'en-IN');
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      if (activeSessionId !== currentTtsSessionId) return;
      isSpeechSynthesisActive = true;
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      isSpeechSynthesisActive = false;
      if (activeSessionId !== currentTtsSessionId) return;

      currentUtterance = null;
      const cb = activeEndCallback;
      activeEndCallback = null;
      if (cb) cb();
    };

    utterance.onerror = (event: any) => {
      isSpeechSynthesisActive = false;
      if (activeSessionId !== currentTtsSessionId) return;

      const errKind = event?.error || '';
      currentUtterance = null;
      activeEndCallback = null;

      if (errKind === 'interrupted' || errKind === 'canceled') {
        return;
      }

      if (options.onError) {
        options.onError(event);
      }
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    isSpeechSynthesisActive = false;
    if (options.onError) {
      options.onError(err);
    }
    return false;
  }
}

