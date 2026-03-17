import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { cn } from '../types';

interface ErrorScreenProps {
  title?: string;
  message?: string;
  type?: '403' | '404' | 'error';
  onBack?: () => void;
}

export default function ErrorScreen({ 
  title = "Acesso Negado", 
  message = "Você não tem permissão para acessar esta área ou o recurso está bloqueado.", 
  type = '403',
  onBack 
}: ErrorScreenProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#09090b] flex items-center justify-center p-6 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -right-1/4 w-96 h-96 bg-rose-500/20 blur-[120px] rounded-full"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.15, 0.1],
            rotate: [0, -90, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -left-1/4 w-96 h-96 bg-amber-500/20 blur-[120px] rounded-full"
        />
      </div>

      <div className="max-w-md w-full text-center relative z-10">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="mb-8 relative inline-block"
        >
          <div className="w-24 h-24 rounded-[32px] bg-rose-500/10 flex items-center justify-center text-rose-500 relative z-10">
            {type === '403' ? <Lock size={48} /> : <ShieldAlert size={48} />}
          </div>
          
          {/* Looping Ring Animation */}
          <motion.div 
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-[32px] border-2 border-rose-500/30"
          />
          <motion.div 
            animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            className="absolute inset-0 rounded-[32px] border-2 border-rose-500/20"
          />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">
            {type === '403' ? '403' : type === '404' ? '404' : 'Erro'}
            <span className="block text-xl text-rose-500 mt-1 uppercase tracking-widest">{title}</span>
          </h1>
          
          <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            {message}
          </p>

          <div className="pt-8">
            <button
              onClick={onBack || (() => window.location.href = '/')}
              className="group flex items-center gap-3 px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 mx-auto"
            >
              <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
              Voltar para o Início
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
