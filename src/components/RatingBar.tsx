interface RatingBarProps {
  onRate: (quality: 0 | 1 | 2 | 3 | 4 | 5) => void;
  disabled?: boolean;
}

const ratings: { quality: 0 | 1 | 2 | 3 | 4 | 5; label: string; color: string }[] = [
  { quality: 0, label: '0\n完全不会', color: 'bg-red-500 hover:bg-red-600' },
  { quality: 1, label: '1\n答错了', color: 'bg-red-400 hover:bg-red-500' },
  { quality: 2, label: '2\n很难', color: 'bg-orange-400 hover:bg-orange-500' },
  { quality: 3, label: '3\n还行', color: 'bg-yellow-400 hover:bg-yellow-500' },
  { quality: 4, label: '4\n不错', color: 'bg-green-400 hover:bg-green-500' },
  { quality: 5, label: '5\n轻松', color: 'bg-green-500 hover:bg-green-600' },
];

export function RatingBar({ onRate, disabled }: RatingBarProps) {
  return (
    <div className="w-full">
      <p className="text-center text-sm text-gray-500 mb-3">你记得多好？</p>
      <div className="grid grid-cols-6 gap-1.5">
        {ratings.map(({ quality, label, color }) => (
          <button
            key={quality}
            onClick={() => onRate(quality)}
            disabled={disabled}
            className={`${color} text-white rounded-xl py-3 text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-pre-line leading-tight`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
