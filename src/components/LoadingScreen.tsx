import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../types';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({ 
  message = "Carregando...", 
  fullScreen = true 
}: LoadingScreenProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center bg-white dark:bg-[#09090b] transition-colors duration-500",
      fullScreen ? "fixed inset-0 z-[100]" : "w-full h-64 rounded-3xl"
    )}>
      <div className="relative mb-8">
        {/* Floating Astronaut for Loading */}
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 mb-4"
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="60" r="40" fill="#10b981" />
            <circle cx="100" cy="60" r="32" fill="#1e1e24" />
            <rect x="70" y="100" width="60" height="70" rx="20" fill="#10b981" />
            <rect x="60" y="110" width="20" height="50" rx="5" fill="#059669" />
          </svg>
        </motion.div>

        {/* Outer Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 -m-4 rounded-[32px] border-2 border-dashed border-emerald-500/30"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-center"
      >
        <p className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 animate-pulse">
          {message}
        </p>
      </motion.div>

      {/* Atmospheric Background Glow */}
      {fullScreen && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <motion.div 
            animate={{ 
              x: [0, 100, 0],
              y: [0, -50, 0]
            }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute -top-20 -left-20 w-80 h-80 bg-emerald-500/30 blur-[100px] rounded-full"
          />
        </div>
      )}
    </div>
  );
}
