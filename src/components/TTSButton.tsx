import { useState, useEffect } from 'react';

interface TTSButtonProps {
  text: string;
  className?: string;
}

export function TTSButton({ text, className = '' }: TTSButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported('speechSynthesis' in window);
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  const speak = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.9;

    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang === 'en-US' && v.localService)
        ?? voices.find(v => v.lang.startsWith('en'));
      if (enVoice) utter.voice = enVoice;
    };

    setVoice();
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', setVoice, { once: true });
    }

    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utter);
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); speak(); }}
      disabled={!supported}
      title={supported ? '朗读' : '当前浏览器不支持朗读'}
      className={`inline-flex items-center justify-center rounded-full ${
        !supported
          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
          : speaking
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
