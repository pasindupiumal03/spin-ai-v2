"use client";

import React from "react";

interface AnimatedLogoProps {
  className?: string;
  size?: number;
}

const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ className = "", size = 40 }) => {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Pulsing background circle */}
      <div 
        className="absolute inset-0 rounded-full bg-lime-400 animate-pulse"
        style={{
          animation: 'logoGlow 2s ease-in-out infinite',
          opacity: 0.5
        }}
      />
      
      {/* Rotating logo */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          animation: 'logoSpin 8s linear infinite'
        }}
      >
        <img
          src="/logo.png"
          alt="Spin Logo"
          className="w-full h-full object-contain"
        />
      </div>

      <style jsx>{`
        @keyframes logoGlow {
          0%, 100% {
            transform: scale(0.6);
            opacity: 0.5;
          }
          50% {
            transform: scale(0.8);
            opacity: 0.8;
          }
        }

        @keyframes logoSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
