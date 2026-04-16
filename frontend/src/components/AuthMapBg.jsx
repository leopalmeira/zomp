import React from 'react'
import './AuthMapBg.css'

export default function AuthMapBg() {
  return (
    <div className="svg-map-container">
      <svg 
        viewBox="0 0 400 800" 
        preserveAspectRatio="xMidYMax slice" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mapFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="35%" stopColor="transparent" />
            <stop offset="60%" stopColor="rgba(0,0,0,0.15)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
          </linearGradient>

          <mask id="mapMask">
            <rect width="100%" height="100%" fill="url(#mapFade)" />
          </mask>

          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* 
          All paths and dots are rendered inside this group.
          The mask ensures they naturally fade into complete transparency at the top
          (around the logo and "Vamos lá" area).
        */}
        <g mask="url(#mapMask)">
          
          {/* Subtle Grid Lines (Streets) */}
          <g stroke="#d4d4d8" strokeWidth="1.5" fill="none" opacity="0.6">
            <path d="M-50,450 L150,450 L250,550 L450,550" />
            <path d="M50,850 L50,650 L150,550 L350,550 L450,450" />
            <path d="M300,350 L300,600 L200,700 L200,850" />
            <path d="M-50,600 L100,600 L100,750 L450,750" />
            
            {/* Additional cross-streets */}
            <path d="M-50,700 L200,700 L280,780 L450,780" />
            <path d="M150,450 L150,850" />
            <path d="M250,350 L250,550" />
            <path d="M350,550 L350,850" />
          </g>

          {/* Animated Cars / Traffic (Glowing Dots) */}
          {/* Path 1 */}
          <circle r="3.5" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="8s" repeatCount="indefinite" path="M-50,450 L150,450 L250,550 L450,550" />
            <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.1; 0.9; 1" dur="8s" repeatCount="indefinite" />
          </circle>

          {/* Path 2 */}
          <circle r="3.5" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="11s" repeatCount="indefinite" path="M50,850 L50,650 L150,550 L350,550 L450,450" />
            <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.1; 0.9; 1" dur="11s" repeatCount="indefinite" />
          </circle>

          {/* Path 3 */}
          <circle r="3.5" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="9.5s" repeatCount="indefinite" path="M300,350 L300,600 L200,700 L200,850" />
            <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.1; 0.9; 1" dur="9.5s" repeatCount="indefinite" />
          </circle>

          {/* Path 4 */}
          <circle r="3.5" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="10s" repeatCount="indefinite" path="M-50,600 L100,600 L100,750 L450,750" />
            <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.1; 0.9; 1" dur="10s" repeatCount="indefinite" />
          </circle>

          {/* Path 5 - Reverse traffic */}
          <circle r="3.5" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="8.5s" repeatCount="indefinite" path="M450,780 L280,780 L200,700 L-50,700" />
            <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.1; 0.9; 1" dur="8.5s" repeatCount="indefinite" />
          </circle>

        </g>
      </svg>
    </div>
  )
}
