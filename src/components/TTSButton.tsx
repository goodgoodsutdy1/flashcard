import { useState, useEffect, useRef } from 'react';

interface TTSButtonProps {
  text: string;
  className?: string;
}

declare global {
  interface Window {
    responsiveVoice?: {
      speak: (text: string, voice: string, params?: object) => void;
      cancel: () => void;
      isPlaying: () => boolean;
    };
  }
}

const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
const hasNativeTTS = !isWeChat && 'speechSynthesis' in window;

function youdaoUrl(text: string) {
  return `https://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(text)}`;
}

export function TTSButton({ text, className = '' }: TTSButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [rvReady, setRvReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (hasNativeTTS) return;
    const timer = setInterval(() => {
      if (window.responsiveVoice) { setRvReady(true); clearInterval(timer); }
    }, 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      window.responsiveVoice?.cancel();
    };
  }, []);

  const fallbackSpeak = () => {
    if (hasNativeTTS) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.9;
      const setVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const v = voices.find(v => v.lang === 'en-US' && v.localService)
          ?? voices.find(v => v.lang.startsWith('en'));
        if (v) utter.voice = v;
      };
      setVoice();
      if (!window.speechSynthesis.getVoices().length)
        window.speechSynthesis.addEventListener('voiceschanged', setVoice, { once: true });
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    } else if (window.responsiveVoice) {
      window.responsiveVoice.cancel();
      setSpeaking(true);
      window.responsiveVoice.speak(text, 'US English Female', {
        rate: 0.9,
        onend: () => setSpeaking(false),
        onerror: () => setSpeaking(false),
      });
    } else {
      setSpeaking(false);
    }
  };

  const speak = () => {
    // Stop any current playback
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    window.responsiveVoice?.cancel();
    setSpeaking(true);

    // Try Youdao first
    const audio = new Audio(youdaoUrl(text));
    audioRef.current = audio;

    // If no sound starts within 2s, fall back
    const fallbackTimer = setTimeout(() => {
      if (audioRef.current === audio) {
        audio.pause();
        audioRef.current = null;
        fallbackSpeak();
      }
    }, 2000);

    audio.onended = () => {
      clearTimeout(fallbackTimer);
      setSpeaking(false);
      audioRef.current = null;
    };

    audio.onerror = () => {
      clearTimeout(fallbackTimer);
      audioRef.current = null;
      fallbackSpeak();
    };

    audio.play().catch(() => {
      clearTimeout(fallbackTimer);
      audioRef.current = null;
      fallbackSpeak();
    });
  };

  const supported = hasNativeTTS || rvReady || true; // Youdao always available as first try

  return (
    <button
      onClick={(e) => { e.stopPropagation(); speak(); }}
      title="朗读"
      className={`inline-flex items-center justify-center rounded-full ${
        speaking
          ? 'bg-indigo-100 text-indigo-600'
          : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
      } ${className}`}
      aria-label="朗读"
    >
      {speaking ? (
        <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z"/>
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z"/>
        </svg>
      )}
    </button>
  );
}
