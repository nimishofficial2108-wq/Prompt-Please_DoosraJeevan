import React from 'react';

// Decorative artwork is an SVG (not a screenshot): fully scalable, light,
// and non-interactive. Connected doctor / brain / report line illustrations.
export default function HeroArtwork() {
  return (
    <svg className="hero-artwork" viewBox="0 0 770 420" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="haze-blue" x1="115" y1="185" x2="650" y2="385" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EAF5FF" stopOpacity=".12" />
          <stop offset="1" stopColor="#DCEEFF" stopOpacity=".83" />
        </linearGradient>
        <linearGradient id="doccoat" x1="105" y1="230" x2="260" y2="360" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D9EAFE" stopOpacity=".64" />
          <stop offset="1" stopColor="#EFF7FF" stopOpacity=".1" />
        </linearGradient>
        <linearGradient id="blush" x1="380" y1="40" x2="495" y2="230">
          <stop stopColor="#FFDDD6" stopOpacity=".75" />
          <stop offset="1" stopColor="#FFF3ED" stopOpacity=".27" />
        </linearGradient>
      </defs>
      {/* Far-background layered waves */}
      <path d="M-65 367C65 250 161 263 251 340c92 80 172-110 287-76 109 32 142-153 291-141v297H-65Z" fill="url(#haze-blue)" />
      <path d="M170 420c95-108 194-110 278-69 125 59 224-24 351-162v231H170Z" fill="#E6F3FF" opacity=".34" />
      <path d="M-10 207c72-95 144-106 242-93 78 10 104 57 173 63 87 7 161-38 211-80" stroke="#FFB4A5" strokeWidth="1.1" opacity=".78" />
      <path d="M17 236c-25-112 139-192 268-160 102 25 129 72 192 102 85 40 153 34 274-58" stroke="#F5A99C" strokeWidth="1.3" opacity=".76" />
      <path d="M179 227c17 93 110 138 219 153 106 15 152-100 229-125 61-20 115 2 174 37" stroke="#AACFF6" strokeWidth="1.2" opacity=".78" />
      <path d="M247 376c92 5 154-13 223-78 112-105 210-68 316-121" stroke="#FFB19F" strokeWidth="1.1" opacity=".7" />
      <g fill="#FEB5A7">
        <circle cx="83" cy="136" r="6.3" /><circle cx="35" cy="236" r="6.3" />
        <circle cx="221" cy="85" r="6.3" /><circle cx="335" cy="238" r="6.3" />
        <circle cx="647" cy="140" r="6.3" /><circle cx="564" cy="326" r="6.3" />
      </g>
      <circle cx="731" cy="254" r="10" fill="#BEDDFB" />
      {/* Faint doctor silhouette, intentionally without a boxed icon */}
      <g transform="translate(89 169)" opacity=".51">
        <path d="M8 183c1-37 19-64 53-74l21-8 26 4 34 19c26 15 39 36 41 61" fill="url(#doccoat)" />
        <path d="M26 180c2-35 16-55 46-68l13 19 22-18 18 20 14-10c17 10 27 30 30 57" fill="#D6E9FC" opacity=".65" />
        <path d="m63 107 28 49 20-45m-36 8-19 61m54-65 28 65" stroke="#90BDEB" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M65 66c-4-19 3-39 24-43 20-3 34 11 33 31l-7 32c-4 17-13 24-27 23-14-1-21-10-23-25l-3-18Z" fill="#C9E0FA" />
        <path d="M64 65c-12-25-2-47 19-48 7-16 28-10 32-5 13 0 18 13 14 26-3 14-11 19-18 19l-3-13c-17 8-28 6-40 5Z" fill="#9CC8F4" opacity=".93" />
        <path d="M75 114c-20 7-21 28-18 39 4 19 23 16 23 1v-14m42-24c23 9 25 30 21 43" stroke="#6DAAE6" strokeWidth="4" strokeLinecap="round" />
        <circle cx="143" cy="159" r="10" stroke="#6DAAE6" strokeWidth="4" fill="#EAF5FF" />
      </g>
      {/* Brain halo and flat outlined organ icon */}
      <circle cx="393" cy="101" r="90" fill="url(#blush)" opacity=".62" />
      <g stroke="#F3A398" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity=".65" transform="translate(315 38)">
        <path d="M80 128c-17 1-26-9-27-22-14 4-27-4-31-18-4-12-1-20 5-27-11-11-9-24 2-33 6-5 12-7 21-6 5-13 18-20 32-16 9-9 28-7 36 1 17-5 32 5 36 21 15 3 23 15 23 29 7 8 8 22 0 31-2 18-16 29-30 27-4 14-15 22-30 21l-17 19-12-2-4-24Z" />
        <path d="M91 18c-7 11-7 28-1 39m-10 9c-16-11-29-1-31 10m42-19c14-14 26-11 39-3m-61 58c11-16 28-13 37-9m-30-73c-13-6-26-3-30 9m72 42c15 4 22-1 29-10m-14 47c-5-11-18-13-28-8m-4-23c8-8 19-13 31-9" />
      </g>
      {/* Organ Donation: a soft heart outline linked to the brain and doctor */}
      <g transform="translate(605 236)" stroke="#F4A99C" strokeWidth="6" opacity=".55" fill="#FFEAE5" strokeLinejoin="round">
        <path d="M57 96 9 48C-13 19 18-14 47 8l10 9 10-9C96-14 127 19 105 48L57 96Z" />
      </g>
    </svg>
  );
}
