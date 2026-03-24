import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, User as UserIcon, Phone, Mail, CreditCard, 
  CheckCircle2, ChevronRight, ChevronLeft, Car, 
  ShieldCheck, Sparkles, MapPin, Search,
  Instagram, Facebook, Youtube, MessageCircle, Lock,
  ChevronDown, ChevronUp, AlertCircle, X
} from 'lucide-react';
import { format, addDays, startOfToday, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, type Shop, type Service, type Booking, type User } from '../types';
import toast from 'react-hot-toast';
import { formatCPF, formatPhone } from '../utils/masks';

export default function BookingFlow({ shopId, user }: { shopId: number, user: User | null }) {
  const [step, setStep] = useState(1);
  const [shop, setShop] = useState<Shop | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    password: '',
    paymentMethod: 'money'
  });
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateOffset, setDateOffset] = useState(0);
  const [showHoursModal, setShowHoursModal] = useState(false);

  const paymentMethodLabels: Record<string, string> = {
    'money': 'DINHEIRO',
    'pix': 'PIX',
    'card': 'CARTÃO'
  };

  useEffect(() => {
    fetch(`/api/shops/${shopId}`, {
      headers: { 
        'x-app-integrity': 'invox-core-v1',
        'Accept': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setShop(data);
      });
  }, [shopId]);

  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      fetch(`/api/bookings/availability?shop_id=${shopId}&date=${dateStr}`, {
        headers: { 
          'x-app-integrity': 'invox-core-v1',
          'Accept': 'application/json'
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setBookedTimes(data.map((b: any) => b.start_time));
          } else {
            setBookedTimes([]);
          }
        });
    }
  }, [selectedDate, shopId]);

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        cpf: user.cpf || '',
        password: user.password // We use the existing password for the booking API
      }));
      setUserExists(true);
    }
  }, [user]);

  useEffect(() => {
    if (user) return; // Skip check if already logged in
    if (formData.email || formData.cpf) {
      const timer = setTimeout(() => {
        fetch(`/api/auth/check-user?email=${formData.email}&cpf=${formData.cpf}`, {
          headers: { 
            'x-app-integrity': 'invox-core-v1',
            'Accept': 'application/json'
          }
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.exists !== undefined) {
              setUserExists(data.exists);
            }
          });
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setUserExists(null);
    }
  }, [formData.email, formData.cpf, user]);

  const handleBooking = async () => {
    if (!selectedService || !selectedTime) return;
    
    setLoading(true);
    const bookingData = {
      shop_id: shopId,
      service_id: selectedService.id,
      customer_name: formData.name,
      customer_email: formData.email,
      customer_phone: formData.phone,
      customer_cpf: formData.cpf,
      password: formData.password,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: selectedTime,
      end_time: selectedTime, // Simple end time for now
      payment_method: formData.paymentMethod,
      total_price: selectedService.price
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      if (res.ok) {
        setStep(5);
        toast.success('Agendamento realizado com sucesso!');
      } else {
        toast.error('Erro ao realizar agendamento.');
      }
    } catch (e) {
      toast.error('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error('Por favor, informe seu e-mail primeiro.');
      return;
    }
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      if (res.ok) {
        toast.success('Link de recuperação enviado para seu e-mail!');
      }
    } catch (e) {
      toast.error('Erro ao solicitar recuperação.');
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  if (!shop) return <div className="p-8 text-center text-zinc-500">Carregando estética...</div>;

  const social = shop.social_links ? JSON.parse(shop.social_links) : [];
  
  // Smart Business Hours Logic
  const getBusinessHours = () => {
    try {
      if (!shop.business_hours) return null;
      const parsed = JSON.parse(shop.business_hours);
      // Handle legacy format {open, close}
      if (parsed.open && parsed.close) {
        return {
          monday: parsed, tuesday: parsed, wednesday: parsed, 
          thursday: parsed, friday: parsed, saturday: parsed, sunday: parsed
        };
      }
      return parsed;
    } catch (e) {
      return null;
    }
  };

  const businessHours = getBusinessHours();
  const daysMap: Record<string, string> = {
    'monday': 'Segunda', 'tuesday': 'Terça', 'wednesday': 'Quarta',
    'thursday': 'Quinta', 'friday': 'Sexta', 'saturday': 'Sábado', 'sunday': 'Domingo'
  };
  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Map ptBR day names to our keys
  const dayKeyMap: Record<string, string> = {
    'segunda-feira': 'monday', 
    'terça-feira': 'tuesday', 
    'quarta-feira': 'wednesday',
    'quinta-feira': 'thursday', 
    'sexta-feira': 'friday', 
    'sábado': 'saturday', 
    'domingo': 'sunday'
  };

  const getTodayStatus = () => {
    if (!businessHours) return { status: 'Horário não informado', color: 'text-zinc-400' };
    
    const now = new Date();
    const currentDayPt = format(now, 'eeee', { locale: ptBR }).toLowerCase();
    const key = dayKeyMap[currentDayPt] || 'monday';
    const dayConfig = businessHours[key];

    if (!dayConfig || dayConfig.closed) {
      return { status: 'Fechado hoje', color: 'text-red-500', hours: '' };
    }

    const [openH, openM] = dayConfig.open.split(':').map(Number);
    const [closeH, closeM] = dayConfig.close.split(':').map(Number);
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;

    if (currentTime >= openTime && currentTime < closeTime) {
      return { 
        status: 'Aberto agora', 
        color: 'text-emerald-500', 
        hours: `${dayConfig.open} - ${dayConfig.close}` 
      };
    } else {
      return { 
        status: 'Fechado no momento', 
        color: 'text-orange-500', 
        hours: `Abre às ${dayConfig.open}` 
      };
    }
  };

  const todayStatus = getTodayStatus();

  const getSocialIcon = (type: string) => {
    switch (type) {
      case 'whatsapp': return <MessageCircle size={20} />;
      case 'instagram': return <Instagram size={20} />;
      case 'facebook': return <Facebook size={20} />;
      case 'youtube': return <Youtube size={20} />;
      case 'tiktok': return <Sparkles size={20} />;
      default: return <Sparkles size={20} />;
    }
  };

  const getSocialColor = (type: string) => {
    switch (type) {
      case 'whatsapp': return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
      case 'instagram': return "bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400";
      case 'facebook': return "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
      case 'youtube': return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
      case 'tiktok': return "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-400";
      default: return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  const getSocialLink = (type: string, value: string) => {
    switch (type) {
      case 'whatsapp': return `https://wa.me/${value.replace(/\D/g, '')}`;
      case 'instagram': return `https://instagram.com/${value.replace('@', '')}`;
      case 'facebook': return value.startsWith('http') ? value : `https://${value}`;
      case 'youtube': return value.startsWith('http') ? value : `https://${value}`;
      case 'tiktok': return `https://tiktok.com/@${value.replace('@', '')}`;
      default: return '#';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* Business Hours Modal */}
      <AnimatePresence>
        {showHoursModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHoursModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white">Horários</h3>
                    <p className="text-sm text-zinc-500">Programação semanal de atendimento</p>
                  </div>
                  <button 
                    onClick={() => setShowHoursModal(false)}
                    className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X size={24} className="text-zinc-400" />
                  </button>
                </div>

                <div className="space-y-3">
                  {daysOrder.map((day) => {
                    const config = businessHours?.[day];
                    const currentDayPt = format(new Date(), 'eeee', { locale: ptBR }).toLowerCase();
                    const isToday = dayKeyMap[currentDayPt] === day;
                    
                    return (
                      <div 
                        key={day}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl transition-all",
                          isToday ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20" : "bg-zinc-50 dark:bg-zinc-800/50 border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn("text-sm font-bold", isToday ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-400")}>
                            {daysMap[day]}
                          </span>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-[8px] font-black text-white uppercase tracking-widest">
                              Hoje
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          {config?.closed ? (
                            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Fechado</span>
                          ) : (
                            <span className="text-sm font-black text-zinc-900 dark:text-white">
                              {config?.open} — {config?.close}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={() => setShowHoursModal(false)}
                  className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: Shop Info (Moved to bottom on mobile) */}
        <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
          <div className="rounded-[40px] border shadow-xl overflow-hidden sticky top-24 transition-colors bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
            <div className="h-48 relative">
              <img 
                src={shop.image_url || `https://picsum.photos/seed/${shop.id}/600/400`} 
                alt={shop.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="text-2xl font-black text-white leading-tight drop-shadow-sm">{shop.name}</h1>
                <div className="flex items-center gap-2 text-white/90 text-xs font-bold uppercase tracking-wider mt-1 drop-shadow-sm">
                  <MapPin size={14} /> {shop.address}
                </div>
              </div>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="space-y-6">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  {shop.description}
                </p>
                
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(social) && social.map((link: any, idx: number) => (
                      <a 
                        key={idx}
                        href={getSocialLink(link.type, link.value)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={cn(
                          "p-3 rounded-2xl hover:scale-110 transition-transform",
                          getSocialColor(link.type)
                        )}
                        title={link.type}
                      >
                        {getSocialIcon(link.type)}
                      </a>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => setShowHoursModal(true)}
                    className="w-full group relative"
                  >
                    <div className="flex items-center justify-between p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-500/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full animate-pulse", todayStatus.color.replace('text', 'bg'))} />
                        <div className="text-left">
                          <p className={cn("text-xs font-black uppercase tracking-wider", todayStatus.color)}>
                            {todayStatus.status}
                          </p>
                          {todayStatus.hours && (
                            <p className="text-[10px] font-bold text-zinc-400">
                              {todayStatus.hours}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400 group-hover:text-emerald-500 transition-colors">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Ver tudo</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-900 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-white">
                    <ShieldCheck size={24} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-bold text-sm dark:text-white">Agendamento Seguro</p>
                    <p className="text-xs text-zinc-400">Seus dados estão protegidos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content: Booking Steps (Moved to top on mobile) */}
        <div className="lg:col-span-9 order-1 lg:order-2">
          <div className="rounded-[40px] border p-6 md:p-12 shadow-sm transition-colors bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
            {/* Progress Bar */}
            <div className="flex justify-between mb-12 relative px-2 md:px-4">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-100 dark:bg-zinc-800 -z-10 -translate-y-1/2" />
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i}
                  className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center border-2 transition-all duration-500",
                    step >= i ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100" : "bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-300 dark:text-zinc-600"
                  )}
                >
                  {step > i ? <CheckCircle2 size={20} className="md:w-6 md:h-6" /> : <span className="font-black text-base md:text-lg">{i}</span>}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Escolha o Serviço</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2">Selecione o melhor cuidado para o seu veículo</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shop.services?.map((service) => (
                <button
                  key={service.id}
                  onClick={() => { setSelectedService(service); nextStep(); }}
                  className={cn(
                    "p-6 rounded-2xl border-2 text-left transition-all hover:shadow-lg group",
                    selectedService?.id === service.id 
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/10" 
                      : "border-zinc-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-900"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                      <Sparkles size={24} />
                    </div>
                    <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">R$ {service.price.toFixed(2)}</span>
                  </div>
                  <h3 className="text-xl font-bold mt-4 text-zinc-900 dark:text-white">{service.name}</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">{service.description}</p>
                  <div className="flex items-center gap-2 mt-4 text-zinc-400 text-xs font-medium uppercase tracking-wider">
                    <Clock size={14} />
                    {service.duration_minutes} minutos
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Quando?</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2">Escolha o dia e horário disponível</p>
            </div>

            <div className="relative group">
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth" id="date-container">
                {[...Array(21)].map((_, i) => {
                  const date = addDays(startOfToday(), i);
                  const isSelected = isSameDay(date, selectedDate);
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        "flex-shrink-0 w-20 h-24 rounded-2xl flex flex-col items-center justify-center transition-all border-2",
                        isSelected 
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-lg" 
                          : "bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-emerald-200"
                      )}
                    >
                      <span className="text-xs uppercase font-bold opacity-70">{format(date, 'EEE', { locale: ptBR })}</span>
                      <span className="text-2xl font-black mt-1">{format(date, 'dd')}</span>
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={() => {
                  const el = document.getElementById('date-container');
                  if (el) el.scrollLeft -= 200;
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border shadow-lg flex items-center justify-center text-zinc-500 hover:text-emerald-500 transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft size={20} />
              </button>
              
              <button 
                onClick={() => {
                  const el = document.getElementById('date-container');
                  if (el) el.scrollLeft += 200;
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border shadow-lg flex items-center justify-center text-zinc-500 hover:text-emerald-500 transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {timeSlots.map((time) => {
                const isBooked = bookedTimes.includes(time);
                return (
                  <button
                    key={time}
                    disabled={isBooked}
                    onClick={() => setSelectedTime(time)}
                    className={cn(
                      "py-3 rounded-xl border-2 font-bold transition-all",
                      isBooked 
                        ? "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-50 dark:border-zinc-800 text-zinc-300 dark:text-zinc-700 cursor-not-allowed" 
                        : selectedTime === time 
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-md" 
                          : "bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-emerald-200"
                    )}
                  >
                    {time}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={prevStep} className="flex items-center gap-2 text-zinc-500 font-bold hover:text-zinc-900 dark:hover:text-white">
                <ChevronLeft size={20} /> Voltar
              </button>
              <button 
                disabled={!selectedTime}
                onClick={nextStep} 
                className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
              >
                Próximo <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Seus Dados</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2">Para confirmarmos seu agendamento</p>
            </div>

            <div className="p-8 rounded-3xl border shadow-sm space-y-4 bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-4">
                  <div className={cn(
                    "grid grid-cols-1 gap-4",
                    (!userExists || user) ? "md:grid-cols-2" : "md:grid-cols-1"
                  )}>
                    <div className={cn(
                      "space-y-2",
                      (userExists && formData.cpf && !formData.email) && "hidden"
                    )}>
                      <label className="text-xs font-bold text-zinc-400 uppercase">E-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                          type="email" 
                          placeholder="joao@email.com"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          disabled={!!user}
                        />
                      </div>
                    </div>
                    <div className={cn(
                      "space-y-2 animate-in fade-in slide-in-from-top-2",
                      (userExists && formData.email && !formData.cpf) && "hidden"
                    )}>
                      <label className="text-xs font-bold text-zinc-400 uppercase">CPF</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                          type="text" 
                          placeholder="000.000.000-00"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                          value={formData.cpf}
                          onChange={e => setFormData({...formData, cpf: formatCPF(e.target.value)})}
                          disabled={!!user}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {(!userExists || user) && (
                  <>
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase">Nome Completo</label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                          type="text" 
                          placeholder="Ex: João Silva"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          disabled={!!user}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase">Número do Celular</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                          type="tel" 
                          placeholder="(11) 99999-9999"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})}
                          disabled={!!user}
                        />
                      </div>
                    </div>
                  </>
                )}

                {!user && userExists === true && (
                  <div className="md:col-span-2 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center gap-3 text-blue-700 dark:text-blue-400">
                      <ShieldCheck size={20} />
                      <p className="text-xs font-bold">Conta encontrada! Por favor, confirme sua senha para vincular o agendamento.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-2">
                          <Lock size={14} /> Confirme sua Senha
                        </label>
                        <button 
                          onClick={handleForgotPassword}
                          className="text-[10px] font-bold text-zinc-400 hover:text-emerald-500 transition-colors uppercase tracking-widest"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                      <div className="relative">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                          type="password" 
                          placeholder="Sua senha de acesso"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all bg-blue-50/30 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
                {!user && userExists === false && (
                  <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs font-bold text-emerald-500 uppercase flex items-center gap-2">
                      <Sparkles size={14} /> Crie uma senha para sua nova conta
                    </label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input 
                        type="password" 
                        placeholder="Sua senha segura"
                        className="w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        required
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400">Com uma conta, você poderá gerenciar seus agendamentos e ganhar pontos.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={prevStep} className="flex items-center gap-2 text-zinc-500 font-bold hover:text-zinc-900 dark:hover:text-white">
                <ChevronLeft size={20} /> Voltar
              </button>
              <button 
                disabled={
                  userExists === true 
                    ? !formData.password 
                    : (!formData.name || !formData.phone || !formData.email || !formData.cpf || !formData.password)
                }
                onClick={nextStep} 
                className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
              >
                Próximo <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Pagamento</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2">Escolha como deseja pagar</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'money', label: 'Dinheiro', icon: <CreditCard size={20} /> },
                { id: 'pix', label: 'PIX', icon: <Sparkles size={20} /> },
                { id: 'card', label: 'Cartão (na hora)', icon: <CreditCard size={20} /> }
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setFormData({...formData, paymentMethod: method.id})}
                  className={cn(
                    "p-6 rounded-2xl border-2 flex items-center gap-4 transition-all",
                    formData.paymentMethod === method.id 
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/10" 
                      : "border-zinc-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-900"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-xl",
                    formData.paymentMethod === method.id 
                      ? "bg-emerald-600 text-white" 
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                  )}>
                    {method.icon}
                  </div>
                  <span className="text-lg font-bold text-zinc-900 dark:text-white">{method.label}</span>
                </button>
              ))}
            </div>

            <div className="p-8 rounded-3xl space-y-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 transition-colors">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Resumo do Agendamento</h3>
              <div className="space-y-2 text-zinc-500 dark:text-zinc-400 text-sm">
                <div className="flex justify-between">
                  <span>Serviço</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Horário</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pagamento</span>
                  <span className="font-bold uppercase text-zinc-900 dark:text-white">{paymentMethodLabels[formData.paymentMethod] || formData.paymentMethod}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-zinc-200 dark:border-white/10 flex justify-between items-center">
                <span className="text-lg text-zinc-900 dark:text-white">Total</span>
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">R$ {selectedService?.price.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={prevStep} className="flex items-center gap-2 text-zinc-500 font-bold hover:text-zinc-900 dark:hover:text-white">
                <ChevronLeft size={20} /> Voltar
              </button>
              <button 
                disabled={loading}
                onClick={handleBooking} 
                className="bg-emerald-600 text-white px-12 py-4 rounded-2xl font-black text-lg flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
              >
                {loading ? 'Processando...' : 'Confirmar Agendamento'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div 
            key="step5"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-6 py-12"
          >
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-4xl font-black text-zinc-900 dark:text-white">Tudo Pronto!</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Seu agendamento para <strong>{selectedService?.name}</strong> foi confirmado para o dia <strong>{format(selectedDate, 'dd/MM')}</strong> às <strong>{selectedTime}</strong>.
            </p>
            <div className="p-6 rounded-2xl inline-block text-left space-y-2 bg-zinc-50 dark:bg-zinc-800">
              <p className="text-sm text-zinc-400 uppercase font-bold">O que acontece agora?</p>
              <ul className="text-zinc-600 dark:text-zinc-400 text-sm space-y-1">
                <li>• Você receberá um e-mail de confirmação</li>
                <li>• Enviaremos um lembrete no seu WhatsApp</li>
                <li>• O pagamento será feito na estética via {formData.paymentMethod}</li>
              </ul>
            </div>
            <div className="pt-8">
              <button 
                onClick={() => window.location.reload()}
                className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-8 py-3 rounded-xl font-bold"
              >
                Voltar ao Início
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
