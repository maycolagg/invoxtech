import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, MapPin, Sparkles, Utensils, 
  Car, Scissors, Coffee, ArrowRight,
  ChevronRight, Star, ShieldCheck, Zap
} from 'lucide-react';
import { cn, type Shop } from '../types';

export default function LandingPage({ onSelectShop, companyName, userRole }: { onSelectShop: (id: number) => void, companyName: string, userRole?: string }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetch('/api/shops', {
      headers: { 
        'x-user-role': userRole || '',
        'x-app-integrity': 'invox-core-v1',
        'Accept': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setShops(data);
        } else {
          console.error("Invalid shops data received:", data);
          setShops([]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch shops:", err);
        setShops([]);
      });
  }, [userRole]);

  const categories = [
    { id: 'all', label: 'Todos', icon: <Sparkles size={18} /> },
    { id: 'estetica', label: 'Estética', icon: <Car size={18} /> },
    { id: 'lanchonete', label: 'Lanchonete', icon: <Utensils size={18} /> },
    { id: 'beleza', label: 'Beleza', icon: <Scissors size={18} /> },
    { id: 'cafe', label: 'Café', icon: <Coffee size={18} /> },
  ];

  const filteredShops = Array.isArray(shops) ? shops.filter(shop => {
    const matchesSearch = shop.name.toLowerCase().includes(search.toLowerCase()) || 
                         shop.address.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || shop.category === category;
    return matchesSearch && matchesCategory;
  }) : [];

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold border border-emerald-500/20"
          >
            <Zap size={16} /> O futuro da gestão de serviços chegou
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] dark:text-white"
          >
            Sua cidade, <br />
            <span className="text-emerald-500">em um só lugar.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-xl text-zinc-500 dark:text-zinc-400 font-medium"
          >
            Descubra e agende os melhores serviços da sua região. De estética automotiva a lanchonetes, a {companyName} conecta você ao que há de melhor.
          </motion.p>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl mx-auto relative"
          >
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-500 transition-colors hidden sm:block" size={24} />
              <input 
                type="text"
                placeholder="O que você está procurando?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-6 sm:pl-16 pr-6 py-6 sm:py-8 rounded-[24px] sm:rounded-[32px] bg-white dark:bg-[#141417] border border-zinc-200 dark:border-white/5 shadow-2xl shadow-zinc-200/50 dark:shadow-none outline-none text-lg sm:text-xl font-medium focus:ring-4 focus:ring-emerald-500/10 transition-all dark:text-white"
              />
              <button className="mt-4 sm:mt-0 sm:absolute sm:right-4 sm:top-1/2 sm:-translate-y-1/2 w-full sm:w-auto bg-zinc-900 dark:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-105 transition-all">
                Pesquisar <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all border-2",
                category === cat.id 
                  ? "bg-zinc-900 dark:bg-emerald-600 border-zinc-900 dark:border-emerald-600 text-white shadow-xl shadow-emerald-500/20" 
                  : "bg-white dark:bg-[#141417] border-zinc-100 dark:border-white/5 text-zinc-500 hover:border-emerald-500/30"
              )}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Shops Grid */}
      <section className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black tracking-tight dark:text-white">Explorar Lojas</h2>
            <p className="text-zinc-500 mt-2">Os estabelecimentos mais bem avaliados perto de você</p>
          </div>
          <div className="flex gap-2">
            <div className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/5 text-sm font-bold text-zinc-500">
              {filteredShops.length} resultados
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredShops.map((shop) => (
            <motion.div
              layout
              key={shop.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group cursor-pointer"
              onClick={() => onSelectShop(shop.id)}
            >
              <div className="rounded-[40px] overflow-hidden border border-zinc-100 dark:border-white/5 bg-white dark:bg-[#141417] transition-all hover:shadow-2xl hover:-translate-y-2">
                <div className="h-64 relative overflow-hidden">
                  <img 
                    src={shop.image_url || `https://picsum.photos/seed/${shop.id}/800/600`} 
                    alt={shop.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-6 right-6 px-4 py-2 rounded-xl bg-white/90 dark:bg-black/60 backdrop-blur-md text-xs font-black uppercase tracking-widest flex items-center gap-2 dark:text-white">
                    <Star size={14} className="text-amber-500 fill-amber-500" /> 4.9
                  </div>
                  <div className="absolute bottom-6 left-6">
                    <div className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                      {shop.category || 'Serviço'}
                    </div>
                  </div>
                </div>
                
                <div className="p-8 space-y-4">
                  <div>
                    <h3 className="text-2xl font-black dark:text-white group-hover:text-emerald-500 transition-colors">{shop.name}</h3>
                    <div className="flex items-center gap-2 text-zinc-400 text-sm mt-1">
                      <MapPin size={14} /> {shop.address}
                    </div>
                  </div>
                  
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm line-clamp-2 leading-relaxed">
                    {shop.description}
                  </p>

                  <div className="pt-6 border-t border-zinc-50 dark:border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      <ShieldCheck size={18} /> Verificado
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <ChevronRight size={24} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-zinc-50 dark:bg-[#141417] py-32 rounded-[80px] mx-6 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-12">
            <div className="space-y-6">
              <h2 className="text-5xl md:text-6xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">
                Por que escolher <br />
                <span className="text-emerald-500">{companyName}?</span>
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-xl font-medium">
                Simplificamos a conexão entre você e os melhores estabelecimentos da sua cidade.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {[
                { title: 'Agendamento 24/7', desc: 'Marque seu horário em segundos, a qualquer hora do dia.', icon: <Star /> },
                { title: 'Pagamento Seguro', desc: 'Diversas formas de pagamento direto no estabelecimento.', icon: <ShieldCheck /> },
                { title: 'Gestão Completa', desc: 'Acompanhe seus agendamentos e histórico em um só lugar.', icon: <Zap /> },
                { title: 'Melhores Preços', desc: 'Acesso a promoções exclusivas dos nossos parceiros.', icon: <Sparkles /> },
              ].map((f, i) => (
                <div key={i} className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    {f.icon}
                  </div>
                  <h4 className="text-zinc-900 dark:text-white font-bold text-lg">{f.title}</h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="aspect-square rounded-[60px] overflow-hidden border-8 border-white/5 dark:border-white/5 bg-zinc-200 dark:bg-zinc-800">
              <img 
                src="https://picsum.photos/seed/business/1000/1000" 
                alt="Business" 
                className="w-full h-full object-cover opacity-60 dark:opacity-60"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-10 -left-10 p-10 rounded-[40px] bg-emerald-600 text-white shadow-2xl space-y-2">
              <p className="text-4xl font-black">+500</p>
              <p className="text-sm font-bold uppercase tracking-widest opacity-80">Lojas Parceiras</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
