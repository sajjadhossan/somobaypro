import React from 'react';

interface OfficialSealProps {
  societyName?: string;
  designation?: string;
  officialName?: string;
  date?: string;
  verificationCode?: string;
  size?: number;
  color?: string; // e.g. '#1e40af' (navy), '#7e22ce' (purple rubber seal), '#047857' (emerald)
}

export const OfficialSeal: React.FC<OfficialSealProps> = ({
  societyName = 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড',
  designation = 'অনুমোদিত',
  officialName,
  date,
  verificationCode,
  size = 130,
  color = '#1e3a8a', // Deep classic rubber stamp navy
}) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  return (
    <div 
      className="inline-block relative select-none pointer-events-none transform -rotate-3 hover:rotate-0 transition duration-300"
      style={{ width: size, height: size }}
      title="অফিসিয়াল সিল / Official Seal"
    >
      <svg
        viewBox="0 0 140 140"
        width={size}
        height={size}
        className="drop-shadow-sm"
      >
        <defs>
          {/* Circular path for top curved text */}
          <path
            id="sealTopCurve"
            d="M 20,70 A 50,50 0 1,1 120,70"
            fill="none"
          />
          {/* Circular path for bottom curved text */}
          <path
            id="sealBottomCurve"
            d="M 120,70 A 50,50 0 0,1 20,70"
            fill="none"
          />
        </defs>

        {/* Outer Ring */}
        <circle
          cx="70"
          cy="70"
          r="66"
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray="1 0"
          opacity="0.9"
        />

        {/* Inner Dotted Ring */}
        <circle
          cx="70"
          cy="70"
          r="58"
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          strokeDasharray="3 2"
          opacity="0.8"
        />

        {/* Core Center Ring */}
        <circle
          cx="70"
          cy="70"
          r="38"
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          opacity="0.85"
        />

        {/* Top Curved Society Name Text */}
        <text
          fill={color}
          fontSize="9.5"
          fontWeight="bold"
          fontFamily="'Hind Siliguri', 'Inter', sans-serif"
          letterSpacing="0.5"
          opacity="0.95"
        >
          <textPath href="#sealTopCurve" startOffset="50%" textAnchor="middle">
            {societyName}
          </textPath>
        </text>

        {/* Bottom Curved Subtitle / District */}
        <text
          fill={color}
          fontSize="8.5"
          fontWeight="bold"
          fontFamily="'Hind Siliguri', 'Inter', sans-serif"
          letterSpacing="1"
          opacity="0.9"
        >
          <textPath href="#sealBottomCurve" startOffset="50%" textAnchor="middle">
            ★ ঢাকা • নিবন্ধিত সমবায় ★
          </textPath>
        </text>

        {/* Center Emblem Stars & Content */}
        {/* Top Star */}
        <text x="70" y="47" fill={color} fontSize="8" textAnchor="middle">★</text>

        {/* Designation Badge */}
        <text
          x="70"
          y="62"
          fill={color}
          fontSize="11"
          fontWeight="900"
          fontFamily="'Hind Siliguri', 'Inter', sans-serif"
          textAnchor="middle"
          letterSpacing="0.5"
        >
          {designation}
        </text>

        {/* Date or Verification in center */}
        {date && (
          <text
            x="70"
            y="75"
            fill={color}
            fontSize="7.5"
            fontWeight="bold"
            fontFamily="'Inter', monospace"
            textAnchor="middle"
          >
            {date}
          </text>
        )}

        {/* Verification code in seal */}
        {verificationCode && (
          <text
            x="70"
            y="85"
            fill={color}
            fontSize="6.5"
            fontWeight="semibold"
            fontFamily="'Inter', monospace"
            textAnchor="middle"
            opacity="0.85"
          >
            {verificationCode.slice(0, 14)}
          </text>
        )}

        {/* Bottom Star */}
        <text x="70" y="96" fill={color} fontSize="8" textAnchor="middle">★</text>
      </svg>
    </div>
  );
};
