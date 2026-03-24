import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, Settings, Plus, 
  MoreVertical, Check, X, Filter,
  LayoutDashboard, Package, Users as UsersIcon,
  Instagram, Facebook, Youtube, MessageCircle, Trash2, Sparkles,
  Share2, Copy, Menu
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, type Booking, type Service, type Shop } from '../types';
import toast from 'react-hot-toast';

export default function ShopOwnerDashboard({ shopId, isAdminView = false, userEmail, userRole }: { shopId: number, isAdminView?: boolean, userEmail?: string, userRole?: string }) {
  const [activeTab, setActiveTab] = useState<'bookings' | 'services' | 'settings'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [socialLinks, setSocialLinks] = useState<{ type: string, value: string }[]>([]);
  const [businessHours, setBusinessHours] = useState<any>({
    monday: { open: '08:00', close: '18:00', closed: false },
    tuesday: { open: '08:00', close: '18:00', closed: false },
    wednesday: { open: '08:00', close: '18:00', closed: false },
    thursday: { open: '08:00', close: '18:00', closed: false },
    friday: { open: '08:00', close: '18:00', closed: false },
    saturday: { open: '08:00', close: '12:00', closed: false },
    sunday: { open: '08:00', close: '12:00', closed: true }
  });
  const [showSocials, setShowSocials] = useState(true);
  const [companySettings, setCompanySettings] = useState({ company_name: 'Invox Tech', logo_url: '/logo.png' });
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const paymentMethodLabels: Record<string, string> = {
    'money': 'DINHEIRO',
    'pix': 'PIX',
    'card': 'CARTÃO'
  };

  const statusLabels: Record<string, string> = {
    'pending': 'Pendente',
    'confirmed': 'Confirmado',
    'in_progress': 'Em Andamento',
    'completed': 'Concluído',
    'cancelled': 'Cancelado'
  };

  const statusColors: Record<string, string> = {
    'pending': 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
    'confirmed': 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
    'in_progress': 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
    'completed': 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    'cancelled': 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
  };

  const socialOptions = [
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={18} />, placeholder: '11999999999' },
    { id: 'instagram', label: 'Instagram', icon: <Instagram size={18} />, placeholder: '@usuario' },
    { id: 'facebook', label: 'Facebook', icon: <Facebook size={18} />, placeholder: 'facebook.com/pagina' },
    { id: 'tiktok', label: 'TikTok', icon: <Sparkles size={18} />, placeholder: '@usuario' },
    { id: 'youtube', label: 'YouTube', icon: <Youtube size={18} />, placeholder: 'youtube.com/@canal' },
  ];

  useEffect(() => {
    const headers = { 
      'x-user-role': userRole || '',
      'x-app-integrity': 'invox-core-v1',
      'Accept': 'application/json'
    };

    fetch(`/api/bookings/shop/${shopId}`, { headers })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBookings(data);
        else setBookings([]);
      });
    
    fetch(`/api/services/${shopId}`, { headers })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setServices(data);
        else setServices([]);
      });

    fetch(`/api/shops/${shopId}`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setShop(data);
          if (data.social_links) {
            try {
              const links = JSON.parse(data.social_links);
              if (Array.isArray(links)) {
                setSocialLinks(links);
              } else {
                const newLinks = Object.entries(links)
                  .filter(([_, value]) => !!value)
                  .map(([type, value]) => ({ type, value: value as string }));
                setSocialLinks(newLinks);
              }
            } catch (e) {
              console.error("Error parsing social links:", e);
              setSocialLinks([]);
            }
          }
          if (data.business_hours) {
            try {
              const parsed = JSON.parse(data.business_hours);
              // Fallback for old structure { open, close }
              if (parsed.open && parsed.close && !parsed.monday) {
                const newStructure: any = {};
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
                  newStructure[day] = { 
                    open: parsed.open, 
                    close: parsed.close, 
                    closed: day === 'sunday' 
                  };
                });
                setBusinessHours(newStructure);
              } else {
                setBusinessHours(parsed);
              }
            } catch (e) {
              console.error("Error parsing business hours:", e);
            }
          }
        }
      });

    fetch('/api/settings', { headers })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setCompanySettings(data);
      });
  }, [shopId, userRole]);

  const updateBooking = async (id: number, updates: Partial<Booking>) => {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-role': userRole || ''
      },
      body: JSON.stringify(updates)
    });

    if (res.ok) {
      toast.success('Agendamento atualizado!');
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
      setEditingBooking(null);
    }
  };

  const saveShopProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updatedShop = {
      name: formData.get('name'),
      slug: formData.get('slug'),
      city: formData.get('city'),
      address: formData.get('address'),
      description: formData.get('description'),
      category: formData.get('category'),
      cnpj_cpf: formData.get('cnpj_cpf'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      type: formData.get('type'),
      business_hours: JSON.stringify(businessHours),
      social_links: JSON.stringify(socialLinks)
    };

    const res = await fetch(`/api/shops/${shopId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-role': userRole || ''
      },
      body: JSON.stringify(updatedShop)
    });

    if (res.ok) {
      toast.success('Perfil atualizado com sucesso!');
    }
  };

  const addSocialLink = () => {
    if (socialLinks.length >= 5) {
      toast.error('Máximo de 5 redes sociais permitido.');
      return;
    }
    setSocialLinks([...socialLinks, { type: 'instagram', value: '' }]);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const updateSocialLink = (index: number, field: 'type' | 'value', val: string) => {
    const newLinks = [...socialLinks];
    newLinks[index][field] = val;
    setSocialLinks(newLinks);
  };

  const addService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newService = {
      shop_id: shopId,
      name: formData.get('name'),
      description: formData.get('description'),
      price: parseFloat(formData.get('price') as string),
      duration_minutes: parseInt(formData.get('duration') as string),
    };

    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-role': userRole || '',
        'x-app-integrity': 'invox-core-v1'
      },
      body: JSON.stringify(newService)
    });

    if (res.ok) {
      toast.success('Serviço adicionado!');
      setShowAddService(false);
      // Refresh services
      fetch(`/api/services/${shopId}`, {
        headers: { 
          'x-user-role': userRole || '',
          'x-app-integrity': 'invox-core-v1'
        }
      }).then(res => res.json()).then(data => setServices(data));
    } else {
      const errorData = await res.json();
      toast.error(errorData.error || 'Erro ao adicionar serviço');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen transition-colors duration-500 bg-zinc-50 dark:bg-[#0a0a0c]">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 border-r p-6 flex-col gap-8 transition-all duration-500 bg-white dark:bg-[#141417] border-zinc-200 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-zinc-900 dark:bg-emerald-600 overflow-hidden">
            <img src={companySettings.logo_url || null} alt={companySettings.company_name} className="w-full h-full object-cover" />
          </div>
          <span className="font-black text-xl tracking-tight dark:text-white">{companySettings.company_name}</span>
        </div>

        <nav className="space-y-2">
          {[
            { id: 'bookings', label: 'Agenda', icon: <Calendar size={18} /> },
            { id: 'services', label: 'Serviços', icon: <Package size={18} /> },
            { id: 'settings', label: 'Personalização', icon: <Settings size={18} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                activeTab === item.id 
                  ? "bg-zinc-900 dark:bg-emerald-600 text-white shadow-lg shadow-zinc-200 dark:shadow-emerald-900/20" 
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 rounded-2xl bg-zinc-100 dark:bg-white/5">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Logado como</p>
          <p className="text-sm font-bold truncate dark:text-white">{shop?.name}</p>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-[#141417] border-t border-zinc-200 dark:border-white/5 z-40 px-6 py-4 flex justify-around items-center">
        {[
          { id: 'bookings', label: 'Agenda', icon: <Calendar size={20} /> },
          { id: 'services', label: 'Serviços', icon: <Package size={20} /> },
          { id: 'settings', label: 'Ajustes', icon: <Settings size={20} /> },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === item.id ? "text-emerald-500" : "text-zinc-400"
            )}
          >
            {item.icon}
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 pb-24 lg:pb-12 overflow-y-auto">
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black dark:text-white">Agenda de Hoje</h2>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg border text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-[#141417] border-zinc-200 dark:border-white/5">
                  <Filter size={20} />
                </button>
                <button className="px-4 py-2 rounded-lg font-bold text-sm bg-zinc-900 dark:bg-emerald-600 text-white">
                  Novo Agendamento
                </button>
              </div>
            </div>

            <div className="rounded-3xl border shadow-sm overflow-hidden bg-white dark:bg-[#141417] border-zinc-200 dark:border-white/5">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-zinc-50/50 dark:bg-white/5 border-zinc-100 dark:border-white/5">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Horário</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Serviço</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Pagamento</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Notas</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-zinc-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-zinc-400" />
                          <span className="font-bold dark:text-white">{booking.start_time}</span>
                        </div>
                        <span className="text-xs text-zinc-400">{format(parseISO(booking.booking_date), 'dd/MM')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold dark:text-white">{booking.customer_name}</div>
                        <div className="text-xs text-zinc-400">{booking.customer_phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          {booking.service_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold dark:text-white">R$ {booking.total_price.toFixed(2)}</div>
                        <div className="text-xs text-zinc-400 uppercase">{paymentMethodLabels[booking.payment_method] || booking.payment_method}</div>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={booking.status}
                          onChange={(e) => updateBooking(booking.id, { status: e.target.value as any })}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold border-none outline-none cursor-pointer appearance-none",
                            statusColors[booking.status]
                          )}
                        >
                          {Object.entries(statusLabels).map(([val, label]) => (
                            <option key={val} value={val} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white">
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-[150px] truncate text-xs text-zinc-500 dark:text-zinc-400 italic">
                          {booking.notes || 'Sem notas'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setEditingBooking(booking)}
                          className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black dark:text-white">Meus Serviços</h2>
              <button 
                onClick={() => setShowAddService(true)}
                className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 bg-zinc-900 dark:bg-emerald-600 text-white"
              >
                <Plus size={20} /> Adicionar Serviço
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div key={service.id} className="p-8 rounded-[32px] border shadow-sm space-y-6 bg-white dark:bg-[#141417] border-zinc-200 dark:border-white/5">
                  <div className="flex justify-between items-start">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Package size={28} />
                    </div>
                    <span className="text-2xl font-black dark:text-white">R$ {service.price.toFixed(2)}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold dark:text-white">{service.name}</h3>
                    <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{service.description}</p>
                  </div>
                  <div className="flex items-center gap-4 pt-6 border-t border-zinc-100 dark:border-white/5">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                      <Clock size={14} /> {service.duration_minutes} min
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {showAddService && (
              <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50 bg-black/60">
                <div className="rounded-[40px] p-10 max-w-md w-full space-y-8 bg-white dark:bg-[#141417] border border-zinc-100 dark:border-white/5 shadow-2xl">
                  <div>
                    <h3 className="text-3xl font-black dark:text-white">Novo Serviço</h3>
                    <p className="text-zinc-500 mt-1">Adicione um novo serviço à sua estética</p>
                  </div>
                  <form onSubmit={addService} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Nome</label>
                      <input name="name" required className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Lavagem Premium" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Descrição</label>
                      <textarea name="description" className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" placeholder="O que inclui?" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Preço (R$)</label>
                        <input name="price" type="number" step="0.01" required className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Duração (min)</label>
                        <input name="duration" type="number" required className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" placeholder="60" />
                      </div>
                    </div>
                    <div className="flex gap-4 pt-6">
                      <button type="button" onClick={() => setShowAddService(false)} className="flex-1 py-4 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5">Cancelar</button>
                      <button type="submit" className="flex-1 py-4 rounded-2xl font-bold bg-zinc-900 dark:bg-emerald-600 text-white shadow-xl shadow-zinc-200 dark:shadow-emerald-900/20">Salvar</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-4xl space-y-10 pb-20">
            <div>
              <h2 className="text-4xl font-black dark:text-white">Personalização</h2>
              <p className="text-zinc-500 mt-1">Configure como sua estética aparece para os clientes</p>
            </div>
            
            <form onSubmit={saveShopProfile} className="space-y-10">
              <div className="p-10 rounded-[40px] border shadow-sm space-y-8 bg-white dark:bg-[#141417] border-zinc-200 dark:border-white/5">
                <h3 className="text-2xl font-black dark:text-white">Perfil da Estética</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Nome da Estética</label>
                    <input name="name" className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" defaultValue={shop?.name} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">URL Personalizada (Slug)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 hidden md:inline">invox.tech/</span>
                      <input name="slug" className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" defaultValue={shop?.slug} placeholder="minha-estetica" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Cidade</label>
                    <input name="city" className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" defaultValue={shop?.city} placeholder="Ex: São Paulo" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Categoria</label>
                    <select name="category" defaultValue={shop?.category || 'estetica'} className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
                      <option value="estetica">Estética Automotiva</option>
                      <option value="lanchonete">Lanchonete / Restaurante</option>
                      <option value="beleza">Beleza / Barbearia</option>
                      <option value="cafe">Café / Padaria</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Tipo de Pessoa</label>
                    <select name="type" defaultValue={shop?.type || 'PJ'} className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500">
                      <option value="PF">Pessoa Física (CPF)</option>
                      <option value="PJ">Pessoa Jurídica (CNPJ)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">CNPJ / CPF</label>
                    <input name="cnpj_cpf" className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" defaultValue={shop?.cnpj_cpf} placeholder="00.000.000/0001-00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">E-mail de Contato</label>
                    <input name="email" type="email" className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" defaultValue={shop?.email} placeholder="contato@empresa.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Telefone / WhatsApp</label>
                    <input name="phone" className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" defaultValue={shop?.phone} placeholder="(11) 99999-9999" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Endereço Completo</label>
                    <input name="address" className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" defaultValue={shop?.address} required />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Bio / Descrição</label>
                    <textarea name="description" className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 min-h-[120px]" defaultValue={shop?.description} />
                  </div>
                </div>

                <div className="pt-8 border-t border-zinc-100 dark:border-white/5">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-lg font-bold dark:text-white">Horário de Funcionamento</h4>
                      <p className="text-xs text-zinc-500">Defina quando sua estética está aberta para agendamentos.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const firstDay = businessHours['monday'] || { open: '08:00', close: '18:00', closed: false };
                        const newHours = { ...businessHours };
                        ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
                          newHours[day] = { ...firstDay };
                        });
                        setBusinessHours(newHours);
                        toast.success('Horários replicados para todos os dias!');
                      }}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all uppercase tracking-widest"
                    >
                      Replicar Segunda
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                      const dayLabels: any = {
                        monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta',
                        thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo'
                      };
                      const isClosed = businessHours[day]?.closed;
                      
                      return (
                        <div key={day} className={`group relative p-4 rounded-2xl transition-all border ${
                          isClosed 
                            ? 'bg-zinc-50/50 dark:bg-white/[0.02] border-zinc-100 dark:border-white/5 opacity-60' 
                            : 'bg-white dark:bg-[#0a0a0c] border-zinc-200 dark:border-white/10 shadow-sm hover:border-emerald-500/50'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-sm font-bold ${isClosed ? 'text-zinc-400' : 'dark:text-white'}`}>
                              {dayLabels[day]}
                            </span>
                            <button
                              type="button"
                              onClick={() => setBusinessHours({
                                ...businessHours,
                                [day]: { ...businessHours[day], closed: !isClosed }
                              })}
                              className={`p-1.5 rounded-lg transition-all ${
                                isClosed 
                                  ? 'bg-rose-500/10 text-rose-500' 
                                  : 'bg-emerald-500/10 text-emerald-500'
                              }`}
                            >
                              {isClosed ? <X size={14} /> : <Check size={14} />}
                            </button>
                          </div>
                          
                          {!isClosed ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <input 
                                  type="time" 
                                  className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 text-xs dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                  value={businessHours[day]?.open || '08:00'}
                                  onChange={(e) => setBusinessHours({
                                    ...businessHours,
                                    [day]: { ...businessHours[day], open: e.target.value }
                                  })}
                                />
                              </div>
                              <span className="text-zinc-300 dark:text-zinc-700">/</span>
                              <div className="flex-1">
                                <input 
                                  type="time" 
                                  className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 text-xs dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                  value={businessHours[day]?.close || '18:00'}
                                  onChange={(e) => setBusinessHours({
                                    ...businessHours,
                                    [day]: { ...businessHours[day], close: e.target.value }
                                  })}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="h-9 flex items-center justify-center border border-dashed border-zinc-200 dark:border-white/5 rounded-xl">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Fechado</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-10 rounded-[40px] border shadow-sm space-y-8 bg-white dark:bg-[#141417] border-zinc-200 dark:border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-black dark:text-white">Redes Sociais</h3>
                    {socialLinks.length > 2 && (
                      <button 
                        type="button"
                        onClick={() => setShowSocials(!showSocials)}
                        className="text-xs font-bold px-3 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all"
                      >
                        {showSocials ? 'Ocultar Redes' : `Mostrar (${socialLinks.length})`}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <input 
                        readOnly 
                        value={`${window.location.origin}${shop?.slug ? `/${shop.slug}` : `?shop=${shopId}`}`}
                        className="bg-transparent border-none outline-none text-[10px] font-mono dark:text-white w-32"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}${shop?.slug ? `/${shop.slug}` : `?shop=${shopId}`}`);
                          toast.success('Link da loja copiado!');
                        }}
                        className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                        title="Copiar Link da Loja"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <button 
                      type="button"
                      onClick={addSocialLink}
                      className="text-sm font-bold text-emerald-600 flex items-center gap-2 hover:text-emerald-700 transition-colors"
                    >
                      <Plus size={20} /> Adicionar Rede
                    </button>
                  </div>
                </div>
                
                {showSocials && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    {socialLinks.map((link, index) => (
                      <div key={index} className="flex flex-col md:flex-row gap-4 items-end group p-6 rounded-3xl bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-100 dark:border-white/5">
                        <div className="w-full md:flex-1 space-y-2">
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Rede Social</label>
                          <select 
                            className="w-full p-4 rounded-2xl outline-none transition-all bg-white dark:bg-[#141417] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            value={link.type}
                            onChange={(e) => updateSocialLink(index, 'type', e.target.value)}
                          >
                            {socialOptions.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-full md:flex-[2] space-y-2">
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Usuário / Link</label>
                          <input 
                            className="w-full p-4 rounded-2xl outline-none transition-all bg-white dark:bg-[#141417] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            placeholder={socialOptions.find(o => o.id === link.type)?.placeholder}
                            value={link.value}
                            onChange={(e) => updateSocialLink(index, 'value', e.target.value)}
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeSocialLink(index)}
                          className="p-4 rounded-2xl text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 size={24} />
                        </button>
                      </div>
                    ))}

                    {socialLinks.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-zinc-100 dark:border-white/5 rounded-[32px]">
                        <p className="text-zinc-400 font-medium">Nenhuma rede social adicionada.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-10 rounded-[40px] border shadow-sm space-y-8 bg-white dark:bg-[#141417] border-zinc-200 dark:border-white/5">
                <h3 className="text-2xl font-black dark:text-white">Segurança</h3>
                <div className="max-w-sm space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Nova Senha</label>
                    <input 
                      type="password" 
                      id="new-password-owner"
                      className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" 
                      placeholder="••••••••"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={async () => {
                      const input = document.getElementById('new-password-owner') as HTMLInputElement;
                      if (!input.value) return toast.error('Digite a nova senha');
                      const res = await fetch('/api/auth/reset-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: userEmail || '', newPassword: input.value })
                      });
                      if (res.ok) {
                        toast.success('Senha alterada com sucesso!');
                        input.value = '';
                      }
                    }}
                    className="px-8 py-4 rounded-2xl font-bold bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-white/10 transition-all"
                  >
                    Atualizar Senha
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="w-full md:w-auto px-16 py-6 rounded-[24px] font-black text-xl shadow-2xl transition-all bg-zinc-900 dark:bg-emerald-600 text-white shadow-zinc-200 dark:shadow-emerald-900/20 hover:scale-[1.02]">
                  Salvar Todas as Alterações
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
      {/* Modal de Edição de Notas */}
      <AnimatePresence>
        {editingBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl border border-zinc-100 dark:border-white/5"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black dark:text-white">Detalhes do Agendamento</h3>
                <button onClick={() => setEditingBooking(null)} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 space-y-2">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Cliente</p>
                  <p className="font-bold dark:text-white text-lg">{editingBooking.customer_name}</p>
                  <p className="text-sm text-zinc-500">{editingBooking.customer_phone}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Notas do Estabelecimento</label>
                  <textarea 
                    className="w-full p-4 rounded-2xl border outline-none transition-all bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 min-h-[120px]"
                    placeholder="Adicione observações sobre o serviço, preferências do cliente, etc..."
                    defaultValue={editingBooking.notes}
                    onBlur={(e) => updateBooking(editingBooking.id, { notes: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setEditingBooking(null)}
                    className="flex-1 py-4 rounded-2xl font-bold bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400"
                  >
                    Fechar
                  </button>
                  <button 
                    onClick={() => setEditingBooking(null)}
                    className="flex-1 py-4 rounded-2xl font-bold bg-zinc-900 dark:bg-emerald-600 text-white"
                  >
                    Salvar Notas
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
