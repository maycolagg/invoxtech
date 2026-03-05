import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Settings, Plus, 
  MoreVertical, Check, X, Filter,
  LayoutDashboard, Package, Users as UsersIcon,
  Instagram, Facebook, Youtube, MessageCircle, Trash2, Sparkles
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, type Booking, type Service, type Shop } from '../types';
import toast from 'react-hot-toast';

export default function ShopOwnerDashboard({ shopId, isAdminView = false, userEmail }: { shopId: number, isAdminView?: boolean, userEmail?: string }) {
  const [activeTab, setActiveTab] = useState<'bookings' | 'services' | 'settings'>(isAdminView ? 'bookings' : 'settings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [socialLinks, setSocialLinks] = useState<{ type: string, value: string }[]>([]);
  const [businessHours, setBusinessHours] = useState({ open: '08:00', close: '18:00' });

  const socialOptions = [
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={18} />, placeholder: '11999999999' },
    { id: 'instagram', label: 'Instagram', icon: <Instagram size={18} />, placeholder: '@usuario' },
    { id: 'facebook', label: 'Facebook', icon: <Facebook size={18} />, placeholder: 'facebook.com/pagina' },
    { id: 'tiktok', label: 'TikTok', icon: <Sparkles size={18} />, placeholder: '@usuario' },
    { id: 'youtube', label: 'YouTube', icon: <Youtube size={18} />, placeholder: 'youtube.com/@canal' },
  ];

  useEffect(() => {
    fetch(`/api/bookings/shop/${shopId}`)
      .then(res => res.json())
      .then(data => setBookings(data));
    
    fetch(`/api/services/${shopId}`)
      .then(res => res.json())
      .then(data => setServices(data));

    fetch(`/api/shops/${shopId}`)
      .then(res => res.json())
      .then(data => {
        setShop(data);
        if (data.social_links) {
          const links = JSON.parse(data.social_links);
          // Handle old format if necessary, or just assume new format
          if (Array.isArray(links)) {
            setSocialLinks(links);
          } else {
            // Convert old object format to new array format
            const newLinks = Object.entries(links)
              .filter(([_, value]) => !!value)
              .map(([type, value]) => ({ type, value: value as string }));
            setSocialLinks(newLinks);
          }
        }
        if (data.business_hours) {
          setBusinessHours(JSON.parse(data.business_hours));
        }
      });
  }, [shopId]);

  const saveShopProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updatedShop = {
      name: formData.get('name'),
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newService)
    });

    if (res.ok) {
      toast.success('Serviço adicionado!');
      setShowAddService(false);
      // Refresh services
      fetch(`/api/services/${shopId}`).then(res => res.json()).then(data => setServices(data));
    }
  };

  return (
    <div className="flex min-h-screen transition-colors duration-500 bg-zinc-50 dark:bg-[#0a0a0c]">
      {/* Sidebar */}
      <aside className="w-64 border-r p-6 flex flex-col gap-8 transition-all duration-500 bg-white dark:bg-[#141417] border-zinc-200 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-zinc-900 dark:bg-emerald-600">
            <LayoutDashboard size={20} />
          </div>
          <span className="font-black text-xl tracking-tight dark:text-white">Estética Pro</span>
        </div>

        <nav className="space-y-2">
          {[
            { id: 'bookings', label: 'Agenda', icon: <Calendar size={18} />, adminOnly: true },
            { id: 'services', label: 'Serviços', icon: <Package size={18} />, adminOnly: true },
            { id: 'settings', label: 'Personalização', icon: <Settings size={18} />, adminOnly: false },
          ].filter(item => isAdminView || !item.adminOnly).map((item) => (
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

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
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
                        <div className="text-xs text-zinc-400 uppercase">{booking.payment_method}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold",
                          booking.status === 'confirmed' ? "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" :
                          booking.status === 'pending' ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                          "bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-400"
                        )}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
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
                  <h4 className="text-lg font-bold dark:text-white mb-6">Horário de Funcionamento</h4>
                  <div className="grid grid-cols-2 gap-6 max-w-sm">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Abertura</label>
                      <input 
                        type="time" 
                        className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" 
                        value={businessHours.open}
                        onChange={(e) => setBusinessHours({ ...businessHours, open: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Fechamento</label>
                      <input 
                        type="time" 
                        className="w-full p-4 rounded-2xl outline-none transition-all bg-zinc-50 dark:bg-[#0a0a0c] border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500" 
                        value={businessHours.close}
                        onChange={(e) => setBusinessHours({ ...businessHours, close: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10 rounded-[40px] border shadow-sm space-y-8 bg-white dark:bg-[#141417] border-zinc-200 dark:border-white/5">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black dark:text-white">Redes Sociais</h3>
                  <button 
                    type="button"
                    onClick={addSocialLink}
                    className="text-sm font-bold text-emerald-600 flex items-center gap-2 hover:text-emerald-700 transition-colors"
                  >
                    <Plus size={20} /> Adicionar Rede
                  </button>
                </div>
                
                <div className="space-y-6">
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
    </div>
  );
}
