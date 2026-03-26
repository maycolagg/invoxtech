import dotenv from "dotenv";
dotenv.config();

import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { createServer as createViteServer } from "vite";
import { supabase } from "./server/supabase";
import bcrypt from "bcrypt";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PEPPER = process.env.PASSWORD_PEPPER || "default-pepper-for-dev-only";

const hashPassword = async (password: string) => {
  return await bcrypt.hash(password + PEPPER, 10);
};

const comparePassword = async (password: string, hash: string) => {
  // Fallback para senhas antigas em texto puro (apenas para transição)
  if (password === hash) return true;
  return await bcrypt.compare(password + PEPPER, hash);
};

const validateCPF = (cpf: string) => {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleanCPF)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
};

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const PORT = 3000;

  const sanitize = (text: any) => {
    if (typeof text !== 'string') return text;
    // Sanitização básica via regex para evitar scripts simples
    return text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
               .replace(/on\w+="[^"]*"/gim, "")
               .replace(/javascript:[^"]*/gim, "");
  };

  // --- LGPD: IP Anonymization ---
  const anonymizeIp = (ip: string) => {
    if (!ip) return "0.0.0.0";
    if (ip.includes(':')) { // IPv6
      return ip.split(':').slice(0, 3).join(':') + ':xxxx:xxxx:xxxx:xxxx:xxxx';
    }
    // IPv4: 192.168.1.1 -> 192.168.1.xxx
    return ip.split('.').slice(0, 3).join('.') + '.xxx';
  };

  // --- RATE LIMITING ---
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições. Tente novamente mais tarde." }
  });

  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login attempts per hour
    message: { error: "Muitas tentativas de login. Tente novamente em 1 hora." }
  });

  // Middleware de Log de Acesso
  app.use(async (req, res, next) => {
    const start = Date.now();
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ip = anonymizeIp(String(rawIp));
    const userAgent = req.headers['user-agent'];

    // Captura o fim da resposta para logar o status code
    res.on('finish', async () => {
      const duration = Date.now() - start;
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        ip: String(ip),
        user_agent: userAgent,
        status: res.statusCode,
        duration_ms: duration
      };

      // Salva no banco de dados (Supabase)
      try {
        await supabase.from("access_logs").insert([logData]);
      } catch (err) {
        // Silencioso para não quebrar a requisição
      }
    });

    next();
  });

  // Segurança: Adiciona headers de segurança (CSP, HSTS, etc)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Vite precisa disso em dev
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://*", "https://picsum.photos"],
        connectSrc: ["'self'", "https://*", "wss://*"],
        frameAncestors: ["'self'", "https://*.run.app", "https://ai.studio", "https://*.google.com"], // Permite o preview
      },
    },
    frameguard: false, // Desativa X-Frame-Options para permitir o iframe do AI Studio
  }));

  app.use(express.json());
  
  // --- PROTEÇÃO GLOBAL DE API ---
  // Bloqueia acesso direto via navegador para TODAS as rotas de API
  app.use("/api", (req, res, next) => {
    // Detecta se é uma navegação direta pelo navegador (URL digitada ou link externo)
    const isDirectNavigation = req.headers['sec-fetch-mode'] === 'navigate';
    
    if (isDirectNavigation && req.method === 'GET') {
      return res.redirect('/?error=403&title=Acesso Restrito&message=As APIs da Invox Tech são protegidas e não podem ser acessadas diretamente pelo navegador.');
    }
    next();
  });

  app.use("/api/", apiLimiter);

  // --- SCHEMAS DE VALIDAÇÃO (ZOD) ---
  const loginSchema = z.object({
    email: z.string().min(1, "E-mail ou CPF é obrigatório"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres")
  });

  const registerSchema = z.object({
    name: z.string().min(3, "Nome muito curto"),
    email: z.string().email("E-mail inválido"),
    phone: z.string().optional(),
    cpf: z.string().refine((val) => validateCPF(val), {
      message: "CPF inválido",
    }),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    role: z.enum(['admin', 'owner', 'customer']).optional(),
    category: z.string().optional()
  });

  // --- MIDDLEWARES DE PROTEÇÃO ---
  const requireAdmin = (req: any, res: any, next: any) => {
    const userRole = req.headers['x-user-role'];
    if (userRole !== 'admin') {
      if (req.accepts('html')) {
        return res.redirect('/?error=403&title=Acesso Proibido&message=Apenas comandantes da Invox Tech podem acessar esta área.');
      }
      return res.status(403).json({ error: "Acesso negado. Apenas administradores podem acessar esta rota." });
    }
    next();
  };

  const requireOwnerOrAdmin = (req: any, res: any, next: any) => {
    const userRole = req.headers['x-user-role'];
    if (userRole !== 'admin' && userRole !== 'owner') {
      if (req.accepts('html')) {
        return res.redirect('/?error=403&title=Acesso Restrito&message=Sua credencial não possui nível de acesso para esta órbita.');
      }
      return res.status(403).json({ error: "Acesso negado. Permissão insuficiente." });
    }
    next();
  };

  // --- API ROUTES ---

  // Auth
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      // Permitir login por E-mail ou CPF
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .or(`email.eq.${email},cpf.eq.${email}`)
        .maybeSingle();

      if (user && await comparePassword(password, user.password)) {
        // Se a senha estava em texto puro, faz o upgrade para hash agora
        if (password === user.password) {
          const hashedPassword = await hashPassword(password);
          await supabase.from("users").update({ password: hashedPassword }).eq("id", user.id);
        }
        res.json(user);
      } else {
        res.status(401).json({ error: "Credenciais inválidas. Verifique seu e-mail/CPF e senha." });
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.issues[0].message });
      }
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const { name, email, phone, cpf, password, role, category } = validatedData;
      
      const sanitizedName = sanitize(name);
    
    // Verificar se já existe
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .or(`email.eq.${email},cpf.eq.${cpf}`)
      .single();

    if (existing) {
      return res.status(400).json({ error: "E-mail ou CPF já cadastrado." });
    }

    const hashedPassword = await hashPassword(password);

    const { data: newUser, error } = await supabase
      .from("users")
      .insert([{ 
        name: sanitizedName, 
        email, 
        phone, 
        cpf, 
        password: hashedPassword, 
        role: role || 'customer', 
        category: category || null 
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Se for dono de estética, criar a loja automaticamente
    if (role === 'owner') {
      const { data: shop, error: shopError } = await supabase
        .from("shops")
        .insert([{ 
          name: name, // Nome inicial da loja é o nome da empresa/dono
          owner_id: newUser.id,
          category: category || 'estetica',
          email: email, // Consistência: usa o email do dono
          phone: phone, // Consistência: usa o telefone do dono
          business_hours: JSON.stringify({
            monday: { open: '08:00', close: '18:00', closed: false },
            tuesday: { open: '08:00', close: '18:00', closed: false },
            wednesday: { open: '08:00', close: '18:00', closed: false },
            thursday: { open: '08:00', close: '18:00', closed: false },
            friday: { open: '08:00', close: '18:00', closed: false },
            saturday: { open: '08:00', close: '12:00', closed: false },
            sunday: { open: '08:00', close: '12:00', closed: true }
          }),
          social_links: JSON.stringify([])
        }])
        .select()
        .single();

      if (shopError) {
        // Rollback user if shop creation fails
        await supabase.from("users").delete().eq("id", newUser.id);
        return res.status(400).json({ error: shopError.message });
      }

      // Atualizar o usuário com o shop_id
      const { data: updatedUser } = await supabase
        .from("users")
        .update({ shop_id: shop.id })
        .eq("id", newUser.id)
        .select()
        .single();
      
      return res.json(updatedUser);
    }

    res.json(newUser);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.issues[0].message });
      }
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    const { data: user } = await supabase.from("users").select("name, email").eq("email", email).single();
    
    if (user) {
      const { data: n8nSetting } = await supabase.from("global_settings").select("value").eq("key", "n8n_webhook_url").single();
      if (n8nSetting?.value) {
        const resetLink = `${req.protocol}://${req.get('host')}/?action=reset&email=${user.email}`;
        await fetch(n8nSetting.value, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: 'PASSWORD_RECOVERY', 
            email: user.email, 
            name: user.name,
            reset_link: resetLink 
          })
        });
      }
    }
    res.json({ success: true, message: "Se o e-mail existir, um link de recuperação será enviado." });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, newPassword } = req.body;
    console.log(`Resetting password for ${email}`);
    
    const hashedPassword = await hashPassword(newPassword);

    const { error } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("email", email);

    if (error) {
      console.error("Reset password error:", error);
      return res.status(400).json({ error: "Erro ao atualizar senha." });
    }
    res.json({ success: true, message: "Senha atualizada com sucesso!" });
  });

  app.get("/api/auth/check-user", async (req, res) => {
    const { email, cpf } = req.query;
    if (!email && !cpf) return res.json({ exists: false });

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .or(`email.eq.${email},cpf.eq.${cpf}`)
      .maybeSingle();

    res.json({ exists: !!user });
  });

  // Shops
  app.get("/api/shops", async (req, res) => {
    const userRole = req.headers['x-user-role'];
    const { city } = req.query;
    
    let query = supabase.from("shops").select("*");
    if (city) {
      query = query.ilike("city", `%${city}%`);
    }
    
    const { data: shops, error } = await query;
    
    // Se não houver cabeçalho de identificação do app, negamos (Proteção contra fetch externo simples)
    if (!userRole && !req.headers['x-app-integrity']) {
      return res.status(401).json({ error: "Acesso não autorizado." });
    }

    // Ocultar dados sensíveis para não-admins
    const formatted = shops?.map(s => {
      if (userRole === 'admin') return s;
      // Removemos TUDO que não é público para o cliente
      const { cnpj_cpf, email, phone, owner_id, created_at, ...publicData } = s;
      return publicData;
    });
    
    res.json(formatted || []);
  });

  app.get("/api/shops/:idOrSlug", async (req, res) => {
    const { idOrSlug } = req.params;
    const isId = /^\d+$/.test(idOrSlug);
    
    let query = supabase.from("shops").select("*");
    if (isId) {
      query = query.eq("id", idOrSlug);
    } else {
      query = query.eq("slug", idOrSlug);
    }
    
    const { data: shop, error: shopErr } = await query.maybeSingle();

    if (!shop) return res.status(404).json({ error: "Estética não encontrada." });

    const { data: services, error: servErr } = await supabase
      .from("services")
      .select("*")
      .eq("shop_id", shop.id);

    const userRole = req.headers['x-user-role'];
    let finalShop = shop;
    
    if (userRole !== 'admin' && userRole !== 'owner') {
      const { cnpj_cpf, ...rest } = shop;
      finalShop = rest;
    }

    res.json({ ...finalShop, services: services || [] });
  });

  app.put("/api/shops/:id", requireOwnerOrAdmin, async (req, res) => {
    const { name, address, description, business_hours, social_links, category, cnpj_cpf, phone, email, type, slug, city } = req.body;
    const { id } = req.params;
    
    // Validar slug se fornecido
    if (slug) {
      const { data: existing } = await supabase.from("shops").select("id").eq("slug", slug).neq("id", id).maybeSingle();
      if (existing) return res.status(400).json({ error: "Este link personalizado já está em uso." });
    }

    const { data: shopToUpdate } = await supabase.from("shops").select("owner_id").eq("id", id).single();

    const { data, error } = await supabase
      .from("shops")
      .update({ 
        name: sanitize(name), 
        address: sanitize(address), 
        description: sanitize(description), 
        business_hours: typeof business_hours === 'string' ? business_hours : JSON.stringify(business_hours), 
        social_links: typeof social_links === 'string' ? social_links : JSON.stringify(social_links),
        category,
        cnpj_cpf,
        phone,
        email,
        type,
        slug: slug ? slug.toLowerCase().replace(/[^a-z0-9-]/g, '-') : undefined,
        city: sanitize(city)
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // --- CONSISTÊNCIA DE DADOS: Sincronizar e-mail e telefone com o dono ---
    if (shopToUpdate?.owner_id) {
      await supabase
        .from("users")
        .update({ email, phone })
        .eq("id", shopToUpdate.owner_id);
    }

    res.json(data);
  });

  app.post("/api/shops", requireAdmin, async (req, res) => {
    const { name, address, description, image_url, owner_id, business_hours, category, cnpj_cpf, phone, email, type } = req.body;
    const { data: shop, error } = await supabase
      .from("shops")
      .insert([{ 
        name: sanitize(name), 
        address: sanitize(address), 
        description: sanitize(description), 
        image_url, 
        owner_id, 
        business_hours: JSON.stringify(business_hours),
        category,
        cnpj_cpf,
        phone,
        email,
        type
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(shop);
  });

  // Services
  app.get("/api/services/:shopId", async (req, res) => {
    const { data: services, error } = await supabase
      .from("services")
      .select("*")
      .eq("shop_id", req.params.shopId);
    res.json(services || []);
  });

  app.post("/api/services", requireOwnerOrAdmin, async (req, res) => {
    const { shop_id, name, description, price, duration_minutes, image_url } = req.body;
    const { data: service, error } = await supabase
      .from("services")
      .insert([{ 
        shop_id, 
        name: sanitize(name), 
        description: sanitize(description), 
        price, 
        duration_minutes, 
        image_url 
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(service);
  });

  // Bookings
  app.get("/api/bookings/user/:userId", async (req, res) => {
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        *,
        shops (name, image_url, slug),
        services (name),
        reviews (rating, comment)
      `)
      .eq("customer_id", req.params.userId)
      .order("booking_date", { ascending: false });
    
    if (error) return res.status(400).json({ error: error.message });
    
    const formatted = bookings?.map(b => ({
      ...b,
      shop_name: (b as any).shops?.name,
      shop_image: (b as any).shops?.image_url,
      shop_slug: (b as any).shops?.slug,
      service_name: (b as any).services?.name,
      review: (b as any).reviews?.[0] || null
    }));

    res.json(formatted || []);
  });

  app.get("/api/bookings/availability", async (req, res) => {
    const { shop_id, date } = req.query;
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("shop_id", shop_id)
      .eq("booking_date", date);
    res.json(bookings || []);
  });

  app.post("/api/bookings", async (req, res) => {
    let { 
      shop_id, service_id, customer_id, customer_name, customer_email, 
      customer_phone, customer_cpf, booking_date, start_time, end_time, 
      payment_method, total_price, password 
    } = req.body;

    // --- REGRA DE NEGÓCIO: Apenas 1 serviço por horário na estética ---
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("shop_id", shop_id)
      .eq("booking_date", booking_date)
      .eq("start_time", start_time)
      .neq("status", "cancelled") // Ignora cancelados
      .maybeSingle();

    if (existingBooking) {
      return res.status(409).json({ error: "Este horário já está ocupado. Por favor, escolha outro momento." });
    }

    // Verificação de conta existente por CPF ou Email para evitar inconstância
    if (!customer_id && (customer_email || customer_cpf)) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, name, email, phone, cpf, password")
        .or(`email.eq.${customer_email},cpf.eq.${customer_cpf}`)
        .maybeSingle();

      if (existingUser) {
        // Se a conta existe, validamos a senha
        if (!(await comparePassword(password, existingUser.password))) {
          return res.status(401).json({ error: "Esta conta já existe. Por favor, informe a senha correta para vincular o agendamento." });
        }
        customer_id = existingUser.id;
        // Opcionalmente atualizamos os dados do agendamento com os dados reais da conta
        customer_name = existingUser.name;
        customer_email = existingUser.email;
        customer_phone = existingUser.phone || customer_phone;
        customer_cpf = existingUser.cpf || customer_cpf;
      } else if (password) {
        // Se não existe e passou senha, criamos a conta automaticamente
        const hashedPassword = await hashPassword(password);
        const { data: newUser } = await supabase
          .from("users")
          .insert([{ 
            name: customer_name, 
            email: customer_email, 
            phone: customer_phone, 
            cpf: customer_cpf, 
            password: hashedPassword, 
            role: 'customer' 
          }])
          .select()
          .single();
        
        if (newUser) {
          customer_id = newUser.id;
        }
      }
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert([{ 
        shop_id, service_id, customer_id, customer_name, customer_email, 
        customer_phone, customer_cpf, booking_date, start_time, end_time, 
        payment_method, total_price 
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Trigger n8n Webhook if configured
    const { data: n8nSetting } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "n8n_webhook_url")
      .single();

    const webhookUrl = n8nSetting?.value;

    const paymentMethodLabels: Record<string, string> = {
      'money': 'DINHEIRO',
      'pix': 'PIX',
      'card': 'CARTÃO'
    };

    if (webhookUrl) {
      try {
        const { data: shop } = await supabase.from("shops").select("name, email").eq("id", shop_id).single();
        const { data: service } = await supabase.from("services").select("name").eq("id", service_id).single();
        
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'NEW_BOOKING',
            booking_id: booking.id,
            shop_name: shop?.name,
            shop_email: shop?.email,
            service_name: service?.name,
            customer_name,
            customer_phone,
            customer_email,
            booking_date,
            start_time,
            payment_method: paymentMethodLabels[payment_method] || payment_method,
            total_price
          })
        });
      } catch (webhookErr) {
        console.error("Failed to trigger n8n webhook:", webhookErr);
      }
    }

    res.json(booking);
  });

  app.get("/api/bookings/shop/:shopId", requireOwnerOrAdmin, async (req, res) => {
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        *,
        services (name)
      `)
      .eq("shop_id", req.params.shopId)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: true });

    // Flatten service name
    const formatted = bookings?.map(b => ({
      ...b,
      service_name: (b as any).services?.name
    }));

    res.json(formatted || []);
  });

  app.put("/api/bookings/:id", requireOwnerOrAdmin, async (req, res) => {
    const { status, notes } = req.body;
    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = sanitize(notes);

    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  // Reviews
  app.post("/api/reviews", async (req, res) => {
    const { booking_id, user_id, shop_id, rating, comment } = req.body;
    
    // Verificar se o agendamento pertence ao usuário e está concluído
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("id", booking_id)
      .eq("customer_id", user_id)
      .single();
    
    if (!booking) return res.status(403).json({ error: "Agendamento não encontrado ou não pertence a você." });
    if (booking.status !== 'completed') return res.status(400).json({ error: "Você só pode avaliar serviços concluídos." });

    const { data, error } = await supabase
      .from("reviews")
      .insert([{ 
        booking_id, 
        user_id, 
        shop_id, 
        rating, 
        comment: sanitize(comment) 
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/reviews/shop/:shopId", async (req, res) => {
    const { data, error } = await supabase
      .from("reviews")
      .select(`
        *,
        users (name)
      `)
      .eq("shop_id", req.params.shopId)
      .order("created_at", { ascending: false });
    
    if (error) return res.status(400).json({ error: error.message });
    
    const formatted = data?.map(r => ({
      ...r,
      user_name: (r as any).users?.name
    }));

    res.json(formatted || []);
  });

  // User Profile
  app.put("/api/auth/profile", async (req, res) => {
    const { id, name, phone, cpf, password } = req.body;
    
    const updateData: any = {
      name: sanitize(name),
      phone: sanitize(phone),
      cpf: sanitize(cpf)
    };
    
    if (password) {
      updateData.password = await hashPassword(password);
    }

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  // Analytics
  app.get("/api/admin/logs", requireAdmin, async (req, res) => {
    const { data: logs, error } = await supabase
      .from("access_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(100);
    
    if (error) return res.status(400).json({ error: error.message });
    res.json(logs);
  });

  app.get("/api/analytics/global", requireAdmin, async (req, res) => {
    const { data: bookings } = await supabase.from("bookings").select("total_price, shop_id").neq("status", "cancelled");
    const { data: shops } = await supabase.from("shops").select("id, name");

    const totalSales = bookings?.reduce((acc, curr) => acc + (curr.total_price || 0), 0) || 0;
    const totalBookings = bookings?.length || 0;
    const shopsCount = shops?.length || 0;

    const salesByShop = shops?.map(shop => {
      const shopSales = bookings?.filter(b => b.shop_id === shop.id).reduce((acc, curr) => acc + (curr.total_price || 0), 0) || 0;
      return { name: shop.name, total: shopSales };
    }) || [];

    res.json({
      totalSales,
      totalBookings,
      shopsCount,
      salesByShop
    });
  });

  // User Management for Super Admin
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const { data: users, error } = await supabase
      .from("users")
      .select(`
        *,
        shops (name)
      `)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    const formatted = users?.map(u => ({
      ...u,
      shop_name: (u as any).shops?.name
    }));

    res.json(formatted || []);
  });

  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const { name, email, phone, cpf, password, role, shop_id } = req.body;
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = sanitize(name);
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (cpf !== undefined) updateData.cpf = cpf;
    if (role !== undefined) updateData.role = role;
    if (shop_id !== undefined) updateData.shop_id = shop_id;
    if (password) {
      updateData.password = await hashPassword(password);
    }

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  // Global Settings
  app.get("/api/settings", async (req, res) => {
    const userRole = req.headers['x-user-role'];
    
    // Proteção básica: apenas o app pode pedir as settings
    if (!userRole && !req.headers['x-app-integrity']) {
      return res.status(401).json({ error: "Acesso não autorizado." });
    }

    const { data: settings } = await supabase.from("global_settings").select("*");
    
    const settingsObj = settings?.reduce((acc: any, curr: any) => {
      // Lista branca de chaves públicas
      const publicKeys = ['company_name', 'logo_url', 'primary_color'];
      
      if (userRole === 'admin') {
        acc[curr.key] = curr.value;
      } else if (publicKeys.includes(curr.key)) {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {}) || {};
    res.json(settingsObj);
  });

  app.post("/api/settings", requireAdmin, async (req, res) => {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from("global_settings").upsert({ key, value });
    }
    res.json({ success: true });
  });

  // Update Shop Social Links
  app.post("/api/shops/:id/social", requireOwnerOrAdmin, async (req, res) => {
    const { social_links } = req.body;
    await supabase
      .from("shops")
      .update({ social_links: JSON.stringify(social_links) })
      .eq("id", req.params.id);
    res.json({ success: true });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.error("Erro ao iniciar Vite:", viteErr);
    }
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    
  // SPA fallback: serve index.html for any non-API routes
  app.get("*", (req, res, next) => {
    if (req.path.startsWith('/api')) {
      const isDirectNavigation = req.headers['sec-fetch-mode'] === 'navigate';
      if (isDirectNavigation) {
        return res.redirect('/?error=404&title=Coordenadas Inválidas&message=Essa rota não existe em nosso mapa estelar.');
      }
      return res.status(404).json({ error: "Rota de API não encontrada." });
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("ERRO FATAL NO SERVIDOR:", err);
  process.exit(1);
});
