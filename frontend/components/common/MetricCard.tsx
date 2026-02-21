"use client";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  progressValue?: number;
  progressColor?: string;
}

export function MetricCard({
  label,
  value,
  icon,
  subtitle,
  progressValue,
  progressColor = "from-emerald-500 to-green-500",
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {label}
        </span>
        {icon}
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
        {value}
      </div>
      {progressValue !== undefined && (
        <div className="mt-3 w-full bg-slate-100 rounded-full h-2 dark:bg-slate-700">
          <div
            className={`bg-gradient-to-r ${progressColor} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${progressValue}%` }}
          />
        </div>
      )}
      {subtitle && (
        <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {subtitle}
        </div>
      )}
    </div>
  );
}
