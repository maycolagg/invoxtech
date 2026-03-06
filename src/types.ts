import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  password?: string;
  role: 'admin' | 'owner' | 'customer';
  shop_id?: number;
  category?: string;
}

export interface Shop {
  id: number;
  name: string;
  address: string;
  description: string;
  image_url: string;
  owner_id: number;
  business_hours: string; // JSON string
  social_links: string; // JSON string
  services?: Service[];
  category?: string; // 'estetica' | 'lanchonete' | etc
  cnpj_cpf?: string;
  phone?: string;
  email?: string;
  type?: 'PF' | 'PJ';
}

export interface Service {
  id: number;
  shop_id: number;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  image_url: string;
}

export interface Booking {
  id: number;
  shop_id: number;
  service_id: number;
  service_name?: string;
  customer_id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_cpf: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'in_progress';
  payment_method: string;
  total_price: number;
  notes?: string;
  created_at: string;
}
