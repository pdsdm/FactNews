"use client";

interface HeadlineSummaryProps {
  headline?: string;
  summary?: string;
  answer?: string;
}

export function HeadlineSummary({
  headline,
  summary,
  answer,
}: HeadlineSummaryProps) {
  if (headline) {
    return (
      <div className="bg-white rounded-2xl p-8 mb-6 border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <h2 className="text-3xl font-bold text-slate-900 mb-4 dark:text-slate-100 font-times-new-roman">
          {headline}
        </h2>
        {summary && (
          <p className="text-lg text-slate-600 leading-relaxed text-justify dark:text-slate-400">
            {summary}
          </p>
        )}
      </div>
    );
  }

  if (answer) {
    return (
      <div className="bg-white rounded-2xl p-8 mb-6 border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <h3 className="text-xl font-semibold text-slate-900 mb-3 dark:text-slate-100 font-times-new-roman">
          Answer
        </h3>
        <p className="text-slate-700 leading-relaxed whitespace-pre-line text-justify dark:text-slate-300">
          {answer}
        </p>
      </div>
    );
  }

  return null;
}
