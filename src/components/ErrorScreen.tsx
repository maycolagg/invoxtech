import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Rocket, Ghost } from 'lucide-react';
import { cn } from '../types';

interface ErrorScreenProps {
  title?: string;
  message?: string;
  code?: string | number;
  onBack?: () => void;
}

const Astronaut = () => (
  <motion.div
    animate={{ 
      y: [0, -20, 0],
      rotate: [0, 5, -5, 0]
    }}
    transition={{ 
      duration: 6, 
      repeat: Infinity, 
      ease: "easeInOut" 
    }}
    className="relative w-48 h-48 mx-auto mb-8"
  >
    {/* Astronaut Body (Stylized SVG) */}
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="astroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      {/* Helmet */}
      <motion.circle 
        cx="100" cy="60" r="40" 
        fill="white" 
        className="dark:fill-zinc-100"
      />
      <circle cx="100" cy="60" r="32" fill="#1e1e24" />
      {/* Visor Reflection */}
      <motion.path 
        d="M85 45 Q100 35 115 45" 
        stroke="white" 
        strokeWidth="2" 
        fill="none" 
        opacity="0.3"
      />
      {/* Body */}
      <rect x="70" y="100" width="60" height="70" rx="20" fill="white" className="dark:fill-zinc-100" />
      {/* Backpack */}
      <rect x="60" y="110" width="20" height="50" rx="5" fill="#d1d5db" />
      {/* Arms */}
      <motion.rect 
        animate={{ rotate: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        x="45" y="105" width="30" height="15" rx="7" fill="white" className="dark:fill-zinc-100" 
      />
      <motion.rect 
        animate={{ rotate: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        x="125" y="105" width="30" height="15" rx="7" fill="white" className="dark:fill-zinc-100" 
      />
      {/* Legs */}
      <rect x="75" y="165" width="20" height="25" rx="5" fill="white" className="dark:fill-zinc-100" />
      <rect x="105" y="165" width="20" height="25" rx="5" fill="white" className="dark:fill-zinc-100" />
    </svg>
    
    {/* Floating Stars around */}
    {[...Array(5)].map((_, i) => (
      <motion.div
        key={i}
        animate={{ 
          scale: [0, 1, 0],
          opacity: [0, 1, 0]
        }}
        transition={{ 
          duration: 2 + i, 
          repeat: Infinity, 
          delay: i * 0.4 
        }}
        className="absolute w-2 h-2 bg-emerald-400 rounded-full blur-[1px]"
        style={{
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
        }}
      />
    ))}
  </motion.div>
);

export default function ErrorScreen({ 
  title = "Perdido no Espaço", 
  message = "Não conseguimos encontrar o que você está procurando.", 
  code = '404',
  onBack 
}: ErrorScreenProps) {
  return (
    <div className="fixed inset-0 z-[200] bg-white dark:bg-[#09090b] flex items-center justify-center p-6 overflow-hidden">
      {/* Space Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent" />
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute bg-zinc-400 dark:bg-white rounded-full opacity-20"
            style={{
              width: Math.random() * 3 + 'px',
              height: Math.random() * 3 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
            }}
          />
        ))}
      </div>

      <div className="max-w-lg w-full text-center relative z-10">
        <Astronaut />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="inline-block px-4 py-1 rounded-full bg-rose-500/10 text-rose-500 text-sm font-black tracking-widest uppercase mb-2">
            Erro {code}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 dark:text-white">
            {title}
          </h1>
          
          <p className="text-zinc-500 dark:text-zinc-400 font-medium text-lg leading-relaxed max-w-md mx-auto">
            {message}
          </p>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onBack || (() => window.location.href = '/')}
              className="group flex items-center gap-3 px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-zinc-900/10 dark:shadow-none"
            >
              <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
              Voltar para a Terra
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-3 px-8 py-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl font-bold transition-all hover:bg-emerald-500/20"
            >
              Tentar Novamente
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
