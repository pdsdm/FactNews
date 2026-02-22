"use client";

import { ExternalLink } from "lucide-react";

interface SourceLinkProps {
  name: string;
  url: string;
}

export function SourceLink({ name, url }: SourceLinkProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-full transition-colors dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300"
    >
      {name}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}
