import React from 'react';
import { Link } from 'react-router-dom';

export default function BrandLogo() {
  return (
    <Link to="/" className="brand" aria-label="DoosraJeevan, go to homepage">
      <svg className="brand-mark" width="50" height="50" viewBox="0 0 60 60" fill="none" aria-hidden="true">
        <circle cx="21" cy="8" r="4.4" fill="#FF6255" />
        <circle cx="39" cy="8" r="4.4" fill="#FF6255" />
        <path d="M30 51.5 12.2 34.5C1.4 24.3 8.6 12.8 19.4 15.9c4.8 1.4 8 4.8 10.6 8.4 2.6-3.6 5.8-7 10.6-8.4 10.8-3.1 18 8.4 7.2 18.6L30 51.5Z" stroke="#FF6255" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m21.6 34 7.2 7.3 13-14" stroke="#4A95D2" strokeWidth="5.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>DoosraJeevan</span>
    </Link>
  );
}
