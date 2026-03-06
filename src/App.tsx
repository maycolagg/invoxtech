import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import BookingFlow from './components/BookingFlow';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import ShopOwnerDashboard from './components/ShopOwnerDashboard';
import LandingPage from './components/LandingPage';
import { 
  Car, Shield, Clock, MapPin, 
  ChevronRight, Star, Sparkles,
  LogOut, User as UserIcon, Lock,
  Menu, X
} from 'lucide-react';
import { cn, type User, type Shop } from './types';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [view, setView] = useState<'landing' | 'booking' | 'admin' | 'owner' | 'login' | 'reset-password'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('Invox Tech');
  const [logoUrl, setLogoUrl] = useState('/logo.png');
  const [isBusiness, setIsBusiness] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.company_name) setCompanyName(data.company_name);
        if (data.logo_url) setLogoUrl(data.logo_url);
      });
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'reset' && params.get('email')) {
      setResetEmail(params.get('email') || '');
      setView('reset-password');
    }

    const shopParam = params.get('shop');

    fetch('/api/shops')
      .then(res => res.json())
      .then(data => {
        setShops(data);
        if (shopParam) {
          const shopId = parseInt(shopParam);
          if (data.some((s: any) => s.id === shopId)) {
            setSelectedShopId(shopId);
            setView('booking');
          }
        } else if (data.length > 0) {
          setSelectedShopId(data[0].id);
        }
      });
  }, []);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    let endpoint = '/api/auth/login';
    if (authMode === 'register') {
      endpoint = '/api/auth/register';
      if (isBusiness) {
        (data as any).role = 'owner';
      }
    }
    if (authMode === 'forgot') endpoint = '/api/auth/forgot-password';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok) {
        if (authMode === 'forgot') {
          setResetEmail(data.email as string);
          toast.success(result.message);
          setAuthMode('login');
        } else {
          setUser(result);
          if (result.role === 'admin') setView('admin');
          else if (result.role === 'owner') setView('owner');
          else setView('booking');
          toast.success(`Bem-vindo, ${result.name}!`);
        }
      } else {
        toast.error(result.error || 'Erro na autenticação');
      }
    } catch (err) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen font-sans transition-all duration-500",
      theme === 'dark' ? "bg-[#09090b] text-zinc-100" : "bg-white text-zinc-900"
    )}>
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className={cn(
        "fixed top-0 left-0 w-full backdrop-blur-md border-b z-50 transition-all duration-500",
        theme === 'dark' ? "bg-[#09090b]/80 border-white/5" : "bg-white/80 border-zinc-100"
      )}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => { setView('landing'); setIsMenuOpen(false); }} className="flex items-center gap-3 group">
            <div className={cn(
              "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-white group-hover:rotate-12 transition-transform overflow-hidden",
              theme === 'dark' ? "bg-[#141417] border border-white/5" : "bg-zinc-900"
            )}>
              <img 
                src={logoUrl} 
                alt={companyName} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-car"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';
                }}
              />
            </div>
            <span className="text-xl md:text-2xl font-black tracking-tighter">{companyName}</span>
          </button>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-6">
            <button 
              onClick={() => setView('landing')}
              className={cn(
                "text-sm font-bold transition-all",
                view === 'landing' ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              Explorar
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn(
                "relative w-14 h-8 rounded-full p-1 transition-all duration-500 flex items-center outline-none",
                theme === 'dark' ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-zinc-100 border border-zinc-200"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full shadow-lg flex items-center justify-center transition-all duration-500 transform",
                theme === 'dark' ? "translate-x-6 bg-emerald-500" : "translate-x-0 bg-white"
              )}>
                {theme === 'dark' ? <Sparkles size={12} className="text-white" /> : <Clock size={12} className="text-zinc-400" />}
              </div>
            </button>

            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  {user.role === 'admin' && (
                    <button 
                      onClick={() => setView('admin')}
                      className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Painel Master
                    </button>
                  )}
                  {user.role === 'owner' && (
                    <button 
                      onClick={() => setView('owner')}
                      className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Minha Estética
                    </button>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <p className="text-sm font-bold">{user.name}</p>
                    {user.role === 'admin' && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-[10px] font-black text-white uppercase tracking-tighter">Master</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 uppercase font-bold">
                    {user.role === 'admin' ? 'Admin Master' : user.role === 'owner' ? 'Dono Estabelecimento' : 'Cliente'}
                  </p>
                </div>
                <button 
                  onClick={() => { setUser(null); setView('landing'); }}
                  className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setView('login')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Lock size={16} /> Login / Cadastro
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex lg:hidden items-center gap-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn(
                "relative w-12 h-7 rounded-full p-1 transition-all duration-500 flex items-center outline-none",
                theme === 'dark' ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-zinc-100 border border-zinc-200"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full shadow-lg flex items-center justify-center transition-all duration-500 transform",
                theme === 'dark' ? "translate-x-5 bg-emerald-500" : "translate-x-0 bg-white"
              )}>
                {theme === 'dark' ? <Sparkles size={10} className="text-white" /> : <Clock size={10} className="text-zinc-400" />}
              </div>
            </button>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-zinc-100 dark:border-white/5 bg-white dark:bg-[#09090b] overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <button 
                  onClick={() => { setView('landing'); setIsMenuOpen(false); }}
                  className="w-full text-left py-3 px-4 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Explorar
                </button>
                {user ? (
                  <>
                    {user.role === 'admin' && (
                      <button 
                        onClick={() => { setView('admin'); setIsMenuOpen(false); }}
                        className="w-full text-left py-3 px-4 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Painel Master
                      </button>
                    )}
                    {user.role === 'owner' && (
                      <button 
                        onClick={() => { setView('owner'); setIsMenuOpen(false); }}
                        className="w-full text-left py-3 px-4 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Minha Estética
                      </button>
                    )}
                    <div className="pt-4 border-t border-zinc-100 dark:border-white/5">
                      <div className="flex items-center justify-between px-4">
                        <div>
                          <p className="font-bold dark:text-white">{user.name}</p>
                          <p className="text-xs text-zinc-400">{user.email}</p>
                        </div>
                        <button 
                          onClick={() => { setUser(null); setView('landing'); setIsMenuOpen(false); }}
                          className="p-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500"
                        >
                          <LogOut size={20} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <button 
                    onClick={() => { setView('login'); setIsMenuOpen(false); }}
                    className="w-full py-4 rounded-2xl bg-zinc-900 dark:bg-emerald-600 text-white font-black text-center"
                  >
                    Login / Cadastro
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="pt-20">
        {view === 'landing' && (
          <LandingPage 
            onSelectShop={(id) => { setSelectedShopId(id); setView('booking'); }} 
            companyName={companyName}
          />
        )}

        {view === 'booking' && selectedShopId && (
          <div className="pb-24">
            <BookingFlow shopId={selectedShopId} user={user} />
          </div>
        )}

        {view === 'admin' && user?.role === 'admin' && (
          <div className="max-w-7xl mx-auto px-6 py-12">
            <SuperAdminDashboard />
          </div>
        )}

        {view === 'owner' && user?.role === 'owner' && user.shop_id && (
          <ShopOwnerDashboard shopId={user.shop_id} userEmail={user.email} />
        )}

        {view === 'reset-password' && (
          <div className="max-w-md mx-auto px-6 py-24">
            <div className={cn(
              "p-10 rounded-[40px] border shadow-2xl space-y-8 transition-all duration-500",
              theme === 'dark' ? "bg-[#141417] border-white/5" : "bg-white border-zinc-100"
            )}>
              <div className="text-center space-y-2">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-6",
                  theme === 'dark' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-900"
                )}>
                  <Lock size={32} />
                </div>
                <h2 className="text-3xl font-black tracking-tight">Nova Senha</h2>
                <p className={theme === 'dark' ? "text-zinc-400" : "text-zinc-500"}>
                  Recuperando acesso para: <span className="font-bold text-emerald-500">{resetEmail}</span>
                </p>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newPassword = formData.get('password');
                const res = await fetch('/api/auth/reset-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: resetEmail, newPassword })
                });
                if (res.ok) {
                  toast.success('Senha atualizada com sucesso!');
                  setView('login');
                  setAuthMode('login');
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Digite sua nova senha</label>
                  <input name="password" type="password" required className={cn(
                    "w-full px-6 py-4 rounded-2xl border-none outline-none transition-all",
                    theme === 'dark' ? "bg-[#0a0a0c] text-white focus:ring-2 focus:ring-emerald-500" : "bg-zinc-100 text-zinc-900 focus:ring-2 focus:ring-zinc-900"
                  )} placeholder="••••••••" />
                </div>
                <button type="submit" className={cn(
                  "w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all mt-4",
                  theme === 'dark' ? "bg-emerald-600 text-white shadow-emerald-900/20 hover:bg-emerald-500" : "bg-zinc-900 text-white shadow-zinc-200 hover:bg-zinc-800"
                )}>
                  Salvar Nova Senha
                </button>
              </form>
              <button 
                onClick={() => setView('login')}
                className="w-full text-center text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                Voltar para o Login
              </button>
            </div>
          </div>
        )}
        {view === 'login' && (
          <div className="max-w-md mx-auto px-6 py-12">
            <div className={cn(
              "p-10 rounded-[40px] border shadow-2xl space-y-8 transition-all duration-500",
              theme === 'dark' ? "bg-[#141417] border-white/5" : "bg-white border-zinc-100"
            )}>
              <div className="text-center space-y-2">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 overflow-hidden",
                  theme === 'dark' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-900"
                )}>
                  <Sparkles size={32} />
                </div>
                <h2 className="text-3xl font-black tracking-tight">
                  {authMode === 'login' ? 'Bem-vindo de volta' : authMode === 'register' ? 'Criar Conta' : 'Recuperar Senha'}
                </h2>
                <p className={theme === 'dark' ? "text-zinc-400" : "text-zinc-500"}>
                  {authMode === 'login' ? 'Acesse seu painel administrativo' : authMode === 'register' ? 'Cadastre-se para agendar mais rápido' : 'Enviaremos um link para seu e-mail'}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'register' && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-100 dark:border-white/5 mb-4">
                    <button 
                      type="button"
                      onClick={() => setIsBusiness(false)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                        !isBusiness ? "bg-white dark:bg-zinc-800 shadow-sm text-emerald-500" : "text-zinc-400"
                      )}
                    >
                      Sou Cliente
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsBusiness(true)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                        isBusiness ? "bg-white dark:bg-zinc-800 shadow-sm text-emerald-500" : "text-zinc-400"
                      )}
                    >
                      Sou Empresa
                    </button>
                  </div>
                )}

                {authMode === 'register' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                        {isBusiness ? 'Nome da Empresa' : 'Nome Completo'}
                      </label>
                      <input name="name" required className={cn(
                        "w-full px-6 py-4 rounded-2xl border-none outline-none transition-all",
                        theme === 'dark' ? "bg-[#0a0a0c] text-white focus:ring-2 focus:ring-emerald-500" : "bg-zinc-100 text-zinc-900 focus:ring-2 focus:ring-zinc-900"
                      )} placeholder={isBusiness ? "Ex: Estética Automotiva Pro" : "Seu nome"} />
                    </div>

                    {isBusiness && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Categoria</label>
                        <select name="category" className={cn(
                          "w-full px-6 py-4 rounded-2xl border-none outline-none transition-all",
                          theme === 'dark' ? "bg-[#0a0a0c] text-white focus:ring-2 focus:ring-emerald-500" : "bg-zinc-100 text-zinc-900 focus:ring-2 focus:ring-zinc-900"
                        )}>
                          <option value="estetica">Estética Automotiva</option>
                          <option value="lanchonete">Lanchonete / Restaurante</option>
                          <option value="beleza">Beleza / Barbearia</option>
                          <option value="cafe">Café / Padaria</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-2 mt-4">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">E-mail</label>
                  <input name="email" type="email" required className={cn(
                    "w-full px-6 py-4 rounded-2xl border-none outline-none transition-all",
                    theme === 'dark' ? "bg-[#0a0a0c] text-white focus:ring-2 focus:ring-emerald-500" : "bg-zinc-100 text-zinc-900 focus:ring-2 focus:ring-zinc-900"
                  )} placeholder="seu@email.com" />
                </div>

                {authMode === 'register' && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">WhatsApp</label>
                      <input name="phone" required className={cn(
                        "w-full px-4 py-4 rounded-2xl border-none outline-none transition-all",
                        theme === 'dark' ? "bg-[#0a0a0c] text-white focus:ring-2 focus:ring-emerald-500" : "bg-zinc-100 text-zinc-900 focus:ring-2 focus:ring-zinc-900"
                      )} placeholder="(11) 9..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                        {isBusiness ? 'CNPJ / CPF' : 'CPF'}
                      </label>
                      <input name="cpf" required className={cn(
                        "w-full px-4 py-4 rounded-2xl border-none outline-none transition-all",
                        theme === 'dark' ? "bg-[#0a0a0c] text-white focus:ring-2 focus:ring-emerald-500" : "bg-zinc-100 text-zinc-900 focus:ring-2 focus:ring-zinc-900"
                      )} placeholder="000..." />
                    </div>
                  </div>
                )}

                {authMode !== 'forgot' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Senha</label>
                    <input name="password" type="password" required className={cn(
                      "w-full px-6 py-4 rounded-2xl border-none outline-none transition-all",
                      theme === 'dark' ? "bg-[#0a0a0c] text-white focus:ring-2 focus:ring-emerald-500" : "bg-zinc-100 text-zinc-900 focus:ring-2 focus:ring-zinc-900"
                    )} placeholder="••••••••" />
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all mt-4 disabled:opacity-50",
                    theme === 'dark' ? "bg-emerald-600 text-white shadow-emerald-900/20 hover:bg-emerald-500" : "bg-zinc-900 text-white shadow-zinc-200 hover:bg-zinc-800"
                  )}
                >
                  {loading ? 'Processando...' : authMode === 'login' ? 'Entrar' : authMode === 'register' ? 'Criar Conta' : 'Enviar Link'}
                </button>
              </form>

              <div className={cn(
                "space-y-4 pt-4 border-t",
                theme === 'dark' ? "border-white/5" : "border-zinc-100"
              )}>
                {authMode === 'login' ? (
                  <>
                    <button onClick={() => setAuthMode('register')} className="w-full text-sm font-bold text-emerald-600 hover:text-emerald-500">Não tem conta? Cadastre-se</button>
                    <button onClick={() => setAuthMode('forgot')} className="w-full text-sm font-bold text-zinc-400 hover:text-zinc-600">Esqueci minha senha</button>
                  </>
                ) : (
                  <button onClick={() => setAuthMode('login')} className="w-full text-sm font-bold text-zinc-400 hover:text-zinc-900">Voltar para o Login</button>
                )}
                <button 
                  onClick={() => setView('booking')}
                  className="w-full text-center text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  Voltar para o site
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={cn(
        "py-12 border-t transition-all duration-500",
        theme === 'dark' ? "bg-[#09090b] border-white/5" : "bg-zinc-50 border-zinc-100"
      )}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-white overflow-hidden",
              theme === 'dark' ? "bg-[#141417] border border-white/5" : "bg-zinc-900"
            )}>
              <img 
                src={logoUrl} 
                alt={companyName} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-car"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';
                }}
              />
            </div>
            <span className={cn(
              "font-black tracking-tighter",
              theme === 'dark' ? "text-white" : "text-zinc-900"
            )}>{companyName}</span>
          </div>
          <p className="text-zinc-400 text-sm font-medium">© 2026 {companyName}. Todos os direitos reservados.</p>
          <div className="flex gap-6 text-sm font-bold text-zinc-500">
            <a href="#" className="hover:text-emerald-500 transition-colors">Termos</a>
            <a href="#" className="hover:text-emerald-500 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-emerald-500 transition-colors">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
