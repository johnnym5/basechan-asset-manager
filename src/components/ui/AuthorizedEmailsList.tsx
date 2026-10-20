"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const AUTHORIZED_EMAILS = [
  "collinsbasechan@gmail.com",
  "egbase@basechaninternational.com",
  "feridu.basechaninternational@gmail.com",
  "info@basechaninternational.com",
  "ithub@basechaninternational.com",
  "johnmary.basechaninternational@gmail.com",
  "jumaibasechaninternational@gmail.com",
  "suhas.chandran22@gmail.com",
];

export const AuthorizedEmailsList: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleEmails = isExpanded ? AUTHORIZED_EMAILS : AUTHORIZED_EMAILS.slice(0, 3);

  return (
    <div className="p-4 rounded-3xl bg-[#FFF8E7] dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 text-xs font-mono text-[#8C4A00] dark:text-amber-200 text-center shadow-sm space-y-2 transition-all">
      <div className="space-y-1">
        {visibleEmails.map((email, idx) => (
          <div key={email} className="truncate leading-relaxed">
            {email}{idx < (isExpanded ? AUTHORIZED_EMAILS.length - 1 : 2) ? "," : ""}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1 text-[11px] font-sans font-bold text-[#7A3E00] dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 bg-amber-200/50 dark:bg-amber-800/40 hover:bg-amber-200 dark:hover:bg-amber-800/60 rounded-full transition-all cursor-pointer"
      >
        <span>{isExpanded ? "Close" : `+${AUTHORIZED_EMAILS.length - 3} more accounts`}</span>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
