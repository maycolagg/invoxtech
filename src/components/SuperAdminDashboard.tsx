import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  Users as UserIcon, Store, TrendingUp, DollarSign, 
  Calendar, ChevronRight, ArrowUpRight, BarChart3,
  Search, Shield, Phone, Mail, Fingerprint, Sparkles
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { cn } from '../types';
import ShopOwnerDashboard from './ShopOwnerDashboard';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'shops' | 'users' | 'settings'>('analytics');
  const [shops, setShops] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [settings, setSettings] = useState<any>({ n8n_webhook_url: '', company_name: 'Invox Tech' });

  const fetchData = () => {
    fetch('/api/analytics/global')
      .then(res => res.json())
      .then(data => setStats(data));
    
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data));

    fetch('/api/shops')
      .then(res => res.json())
      .then(data => setShops(data));

    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => setUsers(data));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveSettings = async () => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings })
    });
    if (res.ok) {
      toast.success('Configurações salvas!');
    }
  };

  if (!stats) return <div className="p-8">Carregando dados globais...</div>;

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight dark:text-white">Painel Master</h1>
          <p className="text-zinc-500 mt-1">Visão geral de todas as estéticas e faturamento global</p>
        </div>
        <div className="p-1.5 rounded-2xl flex gap-1 bg-zinc-100 dark:bg-[#141417] border border-zinc-200 dark:border-white/5">
          <button 
            onClick={() => { setActiveTab('analytics'); setSelectedShopId(null); }}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all", 
              activeTab === 'analytics' 
                ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white" 
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            Analytics
          </button>
          <button 
            onClick={() => { setActiveTab('shops'); setSelectedShopId(null); }}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all", 
              activeTab === 'shops' 
                ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white" 
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            Lojas
          </button>
          <button 
            onClick={() => { setActiveTab('users'); setSelectedShopId(null); }}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all", 
              activeTab === 'users' 
                ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white" 
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            Usuários
          </button>
          <button 
            onClick={() => { setActiveTab('settings'); setSelectedShopId(null); }}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all", 
              activeTab === 'settings' 
                ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white" 
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            Configurações
          </button>
        </div>
      </div>

      {activeTab === 'analytics' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Vendas Totais', value: `R$ ${stats.totalSales.toFixed(2)}`, icon: <DollarSign />, color: 'emerald' },
              { label: 'Agendamentos', value: stats.totalBookings, icon: <Calendar />, color: 'blue' },
              { label: 'Estéticas', value: stats.shopsCount, icon: <Store />, color: 'amber' },
              { label: 'Crescimento', value: '+12.5%', icon: <TrendingUp />, color: 'violet' },
            ].map((stat, i) => (
              <div key={i} className="p-8 rounded-[32px] border transition-all hover:shadow-xl bg-white dark:bg-[#141417] border-zinc-100 dark:border-white/5 shadow-sm">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-6",
                  stat.color === 'emerald' ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                  stat.color === 'blue' ? "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                  stat.color === 'amber' ? "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                  "bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400"
                )}>
                  {stat.icon}
                </div>
                <p className="text-zinc-400 text-xs font-black uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-3xl font-black mt-1 dark:text-white">{stat.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sales by Shop Chart */}
            <div className="lg:col-span-2 p-8 rounded-[40px] border shadow-sm bg-white dark:bg-[#141417] border-zinc-100 dark:border-white/5">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold dark:text-white">Faturamento por Estética</h3>
                <BarChart3 className="text-zinc-300 dark:text-zinc-700" />
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.salesByShop}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 12}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc', opacity: 0.1}}
                      contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#141417', color: '#fff'}}
                    />
                    <Bar dataKey="total" radius={[12, 12, 0, 0]}>
                      {stats.salesByShop.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Activity / Distribution */}
            <div className="p-8 rounded-[40px] border shadow-sm bg-white dark:bg-[#141417] border-zinc-100 dark:border-white/5">
              <h3 className="text-xl font-bold mb-8 dark:text-white">Distribuição</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.salesByShop}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={8}
                      dataKey="total"
                    >
                      {stats.salesByShop.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 space-y-4">
                {stats.salesByShop.map((entry: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                      <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">{entry.name}</span>
                    </div>
                    <span className="text-sm font-black dark:text-white">R$ {entry.total.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'shops' && (
        <div className="space-y-6">
          {selectedShopId ? (
            <div className="space-y-4">
              <button 
                onClick={() => setSelectedShopId(null)}
                className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-4"
              >
                <ChevronRight size={16} className="rotate-180" /> Voltar para Lista de Lojas
              </button>
              <div className="border-4 border-emerald-500/20 rounded-[48px] overflow-hidden">
                <ShopOwnerDashboard shopId={selectedShopId} isAdminView={true} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shops.map((shop) => (
                <div key={shop.id} className="p-8 rounded-[40px] border shadow-sm bg-white dark:bg-[#141417] border-zinc-100 dark:border-white/5 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                      {shop.image_url ? (
                        <img src={shop.image_url} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Store className="text-zinc-400" />
                      )}
                    </div>
                    <button 
                      onClick={() => setSelectedShopId(shop.id)}
                      className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      <ArrowUpRight size={20} />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-xl font-black dark:text-white">{shop.name}</h3>
                    <p className="text-sm text-zinc-500 mt-1 line-clamp-1">{shop.address}</p>
                  </div>
                  <div className="pt-6 border-t border-zinc-50 dark:border-white/5 flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">ID: {shop.id}</span>
                    <button 
                      onClick={() => setSelectedShopId(shop.id)}
                      className="text-sm font-bold text-emerald-600 hover:underline"
                    >
                      Gerenciar Loja
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-8">
          {shops.filter(s => !users.some(u => u.shop_id === s.id)).length > 0 && (
            <div className="p-6 rounded-[32px] bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
                  <Shield size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-400">Dados Inconsistentes Detectados</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-500/80">Existem lojas cadastradas sem um usuário "Dono" vinculado. Isso impede a gestão de senhas.</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                  toast.loading('Sincronizando dados...');
                  // Aqui poderíamos chamar um endpoint de reparo, mas por enquanto orientamos o SQL
                  toast.dismiss();
                  toast.error('Por favor, execute o script SQL de reparo no Supabase.');
                }}
                className="px-6 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-all"
              >
                Como Corrigir?
              </button>
            </div>
          )}

          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="text"
              placeholder="Pesquisar por nome, e-mail ou CPF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-[#141417] border border-zinc-100 dark:border-white/5 outline-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {users.filter(u => 
              u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.cpf?.includes(searchQuery)
            ).map((u) => (
              <div key={u.id} className="p-6 rounded-[32px] border bg-white dark:bg-[#141417] border-zinc-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    u.role === 'admin' ? "bg-emerald-500/10 text-emerald-500" :
                    u.role === 'owner' ? "bg-amber-500/10 text-amber-500" :
                    "bg-blue-500/10 text-blue-500"
                  )}>
                    <UserIcon size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold dark:text-white">{u.name}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                        u.role === 'admin' ? "bg-emerald-500 text-white" :
                        u.role === 'owner' ? "bg-amber-500 text-white" :
                        "bg-blue-500 text-white"
                      )}>
                        {u.role}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1">
                      {u.category && (
                        <div className="flex items-center gap-1 text-xs text-emerald-500 font-bold uppercase">
                          <Sparkles size={12} /> {u.category}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-zinc-400 font-bold">
                        <Mail size={12} /> {u.email}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-400 font-bold">
                        <Phone size={12} /> {u.phone || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-400 font-bold">
                        <Fingerprint size={12} /> {u.cpf || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {u.shop_name && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10">
                      <Store size={14} className="text-emerald-500" />
                      <span className="text-xs font-bold dark:text-zinc-300">Vínculo: {u.shop_name}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      placeholder="Nova senha..."
                      id={`pass-${u.id}`}
                      className="px-4 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-100 dark:border-white/5 outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
                    />
                    <button 
                      onClick={async () => {
                        const input = document.getElementById(`pass-${u.id}`) as HTMLInputElement;
                        if (!input.value) return toast.error('Digite a nova senha');
                        const res = await fetch(`/api/admin/users/${u.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ password: input.value })
                        });
                        if (res.ok) {
                          toast.success('Senha atualizada!');
                          input.value = '';
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white/5 text-white dark:text-zinc-300 text-xs font-bold hover:bg-zinc-800 dark:hover:bg-white/10 transition-all"
                    >
                      Salvar Senha
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="p-10 rounded-[40px] border shadow-xl max-w-2xl space-y-8 bg-white dark:bg-[#141417] border-zinc-100 dark:border-white/5">
          <div>
            <h3 className="text-3xl font-black dark:text-white">Configurações Globais</h3>
            <p className="text-zinc-500 mt-1">Gerencie as integrações e marca do sistema</p>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">N8N Webhook URL</label>
              <input 
                type="text" 
                className="w-full p-5 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-100 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                placeholder="https://n8n.seu-servidor.com/webhook/..."
                value={settings.n8n_webhook_url}
                onChange={(e) => setSettings({ ...settings, n8n_webhook_url: e.target.value })}
              />
              <p className="text-xs text-zinc-400 mt-2">Este webhook será disparado em cada novo agendamento para automação.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Nome da Empresa (Branding)</label>
              <input 
                type="text" 
                className="w-full p-5 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-100 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              />
            </div>
          </div>
          <button 
            onClick={saveSettings}
            className="w-full md:w-auto px-12 py-5 bg-zinc-900 dark:bg-emerald-600 text-white rounded-2xl font-black text-lg hover:scale-[1.02] transition-all shadow-xl shadow-zinc-200 dark:shadow-emerald-900/20"
          >
            Salvar Configurações
          </button>

          <div className="pt-10 border-t border-zinc-100 dark:border-white/5 space-y-8">
            <div>
              <h3 className="text-3xl font-black dark:text-white">Segurança</h3>
              <p className="text-zinc-500 mt-1">Altere sua senha de acesso master</p>
            </div>
            <div className="max-w-sm space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Nova Senha Master</label>
                <input 
                  type="password" 
                  id="master-new-password"
                  className="w-full p-5 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-100 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="••••••••"
                />
              </div>
              <button 
                onClick={async () => {
                  const input = document.getElementById('master-new-password') as HTMLInputElement;
                  if (!input.value) return toast.error('Digite a nova senha');
                  const res = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'admin@lavajato.pro', newPassword: input.value })
                  });
                  if (res.ok) {
                    toast.success('Senha master atualizada!');
                    input.value = '';
                  }
                }}
                className="px-12 py-5 bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-white rounded-2xl font-black text-lg hover:bg-zinc-200 dark:hover:bg-white/10 transition-all"
              >
                Atualizar Senha Master
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
