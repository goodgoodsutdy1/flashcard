import { useState, useEffect } from 'react';

interface TTSButtonProps {
  text: string;
  className?: string;
}

export function TTSButton({ text, className = '' }: TTSButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true); // assume supported, check after mount

  useEffect(() => {
    // Check after mount — some Android browsers expose speechSynthesis only after load
    setSupported('speechSynthesis' in window);
    return () => {
      window.speechSynthesis?.cancel();
    };
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
      title={supported ? '朗读发音' : '当前浏览器不支持朗读'}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full transition-all active:scale-95 ${
        !supported
          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
          : speaking
          ? 'bg-indigo-100 text-indigo-700'
          : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
      } ${className}`}
      aria-label="朗读发音"
    >
      {speaking ? (
        <svg className="w-5 h-5 animate-pulse flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.814L4.383 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.383l4-2.924a1 1 0 011 .076zM14.657 5.343a1 1 0 011.414 0A8 8 0 0116 10a8 8 0 01-.929 4.657 1 1 0 01-1.414-1.414A6 6 0 0015 10a6 6 0 00-.343-3.243 1 1 0 010-1.414z" />
          <path d="M12.828 7.172a1 1 0 011.414 0A4 4 0 0115 10a4 4 0 01-.758 2.243 1 1 0 01-1.414-1.414A2 2 0 0013 10a2 2 0 00-.172-.828 1 1 0 010-1.414z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.814L4.383 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.383l4-2.924a1 1 0 011 .076zM14.657 5.343a1 1 0 011.414 0A8 8 0 0116 10a8 8 0 01-.929 4.657 1 1 0 01-1.414-1.414A6 6 0 0015 10a6 6 0 00-.343-3.243 1 1 0 010-1.414z" />
        </svg>
      )}
      <span className="text-xs font-medium">{speaking ? '朗读中' : '朗读'}</span>
    </button>
  );
}
