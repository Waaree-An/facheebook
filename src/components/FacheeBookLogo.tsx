
import React from 'react';

interface FacheeBookLogoProps {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}

export const FacheeBookLogo: React.FC<FacheeBookLogoProps> = ({
  className = '',
  markClassName = '',
  showWordmark = true,
}) => (
  <div className={`inline-flex items-center gap-3 ${className}`}>
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-[#071A3A] shadow-md shadow-blue-950/20 ${markClassName}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 48 48"
        className="h-full w-full p-1.5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="fachee-book-blue" x1="7" y1="8" x2="41" y2="40">
            <stop stopColor="#22D3EE" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
        </defs>

        {/* Open book */}
        <path
          d="M23 15C18 10.5 12 10 6 12V34C12 32 18 33 23 37V15Z"
          stroke="url(#fachee-book-blue)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M25 15C30 10.5 36 10 42 12V34C36 32 30 33 25 37V15Z"
          stroke="url(#fachee-book-blue)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Integrated F */}
        <path
          d="M19 12H32V16H23V21H30V25H23V34L19 31V12Z"
          fill="#FFFFFF"
        />

        {/* Digital learning pixels */}
        <rect x="34" y="5" width="4" height="4" rx="1" fill="#22D3EE" />
        <rect x="39" y="9" width="3.5" height="3.5" rx="0.8" fill="#38BDF8" />
        <rect x="34" y="12" width="3" height="3" rx="0.7" fill="#FBBF24" />
      </svg>
    </span>

    {showWordmark && (
      <span className="text-xl font-extrabold tracking-tight text-slate-900">
        Fachee<span className="text-sky-500">Book</span>
      </span>
    )}
  </div>
);