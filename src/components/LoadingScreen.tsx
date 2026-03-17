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
      <div className="relative">
        {/* Outer Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-20 h-20 rounded-[24px] border-4 border-zinc-100 dark:border-white/5 border-t-emerald-500"
        />
        
        {/* Inner Pulsing Logo/Dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"
          />
        </div>
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
