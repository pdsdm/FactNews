"use client";

interface ErrorBannerProps {
  message: string | null;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 mt-6">
      <div className="bg-red-50 border border-red-300 text-red-800 rounded-lg p-4 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
        <strong>Error:</strong> {message}
      </div>
    </div>
  );
}
