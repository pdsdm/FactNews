"use client";

interface SourceCardProps {
  name: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function SourceCard({
  name,
  selected,
  onToggle,
  disabled = false,
}: SourceCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`
        px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 border
        ${
          selected
            ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500"
            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
        }
        ${disabled && !selected ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {name}
    </button>
  );
}
