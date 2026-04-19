import React, { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './AuthMapBg.css'

// Autopan Feature
function MapPanLoop() {
  const map = useMap();
  useEffect(() => {
    const interval = setInterval(() => {
      map.panBy([0.3, 0.3], { animate: false });
    }, 50);
    return () => clearInterval(interval);
  }, [map]);
  return null;
}

export default function AuthMapBg() {
  return (
    <div className="svg-map-container">
      
      {/* 1. REAL DARK TILE MAP */}
      <MapContainer 
        center={[-23.5505, -46.6333]} // Foco em São Paulo metrópole
        zoom={14} 
        zoomControl={false} 
        scrollWheelZoom={false} 
        dragging={false}
        doubleClickZoom={false}
        style={{ width: '100%', height: '100%', position: 'absolute', zIndex: 0, background: '#0c0f14' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          opacity={0.8}
        />
        <MapPanLoop />
      </MapContainer>

      {/* 2. ANIMATED GLOWING DOTS OVERLAY */}
      <svg 
        viewBox="0 0 400 800" 
        preserveAspectRatio="xMidYMax slice" 
        xmlns="http://www.w3.org/2000/svg"
        style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1}}
      >
        <defs>
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Traffic Dots ONLY (Lines are invisible to simulate following the real roads below) */}
        <g>
          {/* Car 1 */}
          <circle r="4.5" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="22s" repeatCount="indefinite" path="M-50,450 L150,450 L250,550 L450,550" />
            <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.1; 0.9; 1" dur="22s" repeatCount="indefinite" />
          </circle>

          {/* Car 2 */}
          <circle r="4" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="28s" repeatCount="indefinite" path="M50,850 L50,650 L150,550 L350,550 L450,450" />
            <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.1; 0.9; 1" dur="28s" repeatCount="indefinite" />
          </circle>

          {/* Car 3 */}
          <circle r="4" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="25s" repeatCount="indefinite" path="M300,350 L300,600 L200,700 L200,850" />
            <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.1; 0.9; 1" dur="25s" repeatCount="indefinite" />
          </circle>

          {/* Car 4 */}
          <circle r="4.5" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="20s" repeatCount="indefinite" path="M-50,600 L100,600 L100,750 L450,750" />
            <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.1; 0.9; 1" dur="20s" repeatCount="indefinite" />
          </circle>

          {/* Car 5 */}
          <circle r="3.5" fill="#00E676" filter="url(#neonGlow)">
            <animateMotion dur="24s" repeatCount="indefinite" path="M450,780 L280,780 L200,700 L-50,700" />
            <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.1; 0.9; 1" dur="24s" repeatCount="indefinite" />
          </circle>

        </g>
      </svg>
    </div>
  )
}
