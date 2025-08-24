"use client";

import React from "react";
import { motion } from "framer-motion";

interface AnimatedLogoProps {
  className?: string;
  size?: number;
}

const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ className = "", size = 40 }) => {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full bg-lime-400"
        initial={{ scale: 0.6, opacity: 0.5 }}
        animate={{ 
          scale: [0.6, 0.8, 0.6],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <img
          src="/logo.png"
          alt="Spin Logo"
          className="w-full h-full object-contain"
        />
      </motion.div>
    </div>
  );
};

export default AnimatedLogo;
