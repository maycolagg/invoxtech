import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer as createViteServer } from "vite";
import { supabase } from "./server/supabase.ts";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Auth
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    // Permitir login por E-mail ou CPF
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .or(`email.eq.${email},cpf.eq.${email}`)
      .eq("password", password)
      .maybeSingle();

    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Credenciais inválidas. Verifique seu e-mail/CPF e senha." });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { name, email, phone, cpf, password, role, category } = req.body;
    
    // Verificar se já existe
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .or(`email.eq.${email},cpf.eq.${cpf}`)
      .single();

    if (existing) {
      return res.status(400).json({ error: "E-mail ou CPF já cadastrado." });
    }

    const { data: newUser, error } = await supabase
      .from("users")
      .insert([{ name, email, phone, cpf, password, role: role || 'customer', category: category || null }])
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
          business_hours: JSON.stringify({ open: '08:00', close: '18:00' }),
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
    const { error } = await supabase
      .from("users")
      .update({ password: newPassword })
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
    const { data: shops, error } = await supabase.from("shops").select("*");
    res.json(shops || []);
  });

  app.get("/api/shops/:id", async (req, res) => {
    const { data: shop, error: shopErr } = await supabase
      .from("shops")
      .select("*")
      .eq("id", req.params.id)
      .single();

    const { data: services, error: servErr } = await supabase
      .from("services")
      .select("*")
      .eq("shop_id", req.params.id);

    res.json({ ...shop, services: services || [] });
  });

  app.put("/api/shops/:id", async (req, res) => {
    const { name, address, description, business_hours, social_links, category, cnpj_cpf, phone, email, type } = req.body;
    const { data, error } = await supabase
      .from("shops")
      .update({ 
        name, 
        address, 
        description, 
        business_hours, 
        social_links,
        category,
        cnpj_cpf,
        phone,
        email,
        type
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/shops", async (req, res) => {
    const { name, address, description, image_url, owner_id, business_hours, category, cnpj_cpf, phone, email, type } = req.body;
    const { data: shop, error } = await supabase
      .from("shops")
      .insert([{ 
        name, 
        address, 
        description, 
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

  app.post("/api/services", async (req, res) => {
    const { shop_id, name, description, price, duration_minutes, image_url } = req.body;
    const { data: service, error } = await supabase
      .from("services")
      .insert([{ shop_id, name, description, price, duration_minutes, image_url }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(service);
  });

  // Bookings
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

    // Verificação de conta existente por CPF ou Email para evitar inconstância
    if (!customer_id && (customer_email || customer_cpf)) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, name, email, phone, cpf, password")
        .or(`email.eq.${customer_email},cpf.eq.${customer_cpf}`)
        .maybeSingle();

      if (existingUser) {
        // Se a conta existe, validamos a senha
        if (existingUser.password !== password) {
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
        const { data: newUser } = await supabase
          .from("users")
          .insert([{ 
            name: customer_name, 
            email: customer_email, 
            phone: customer_phone, 
            cpf: customer_cpf, 
            password, 
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

    if (webhookUrl) {
      try {
        const { data: shop } = await supabase.from("shops").select("name").eq("id", shop_id).single();
        const { data: service } = await supabase.from("services").select("name").eq("id", service_id).single();
        
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'NEW_BOOKING',
            booking_id: booking.id,
            shop_name: shop?.name,
            service_name: service?.name,
            customer_name,
            customer_phone,
            customer_email,
            booking_date,
            start_time,
            payment_method,
            total_price
          })
        });
      } catch (webhookErr) {
        console.error("Failed to trigger n8n webhook:", webhookErr);
      }
    }

    res.json(booking);
  });

  app.get("/api/bookings/shop/:shopId", async (req, res) => {
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

  // Analytics
  app.get("/api/analytics/global", async (req, res) => {
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
  app.get("/api/admin/users", async (req, res) => {
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

  app.put("/api/admin/users/:id", async (req, res) => {
    const { name, email, phone, cpf, password, role, shop_id } = req.body;
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (cpf !== undefined) updateData.cpf = cpf;
    if (role !== undefined) updateData.role = role;
    if (shop_id !== undefined) updateData.shop_id = shop_id;
    if (password) updateData.password = password;

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
    const { data: settings } = await supabase.from("global_settings").select("*");
    const settingsObj = settings?.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {}) || {};
    res.json(settingsObj);
  });

  app.post("/api/settings", async (req, res) => {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from("global_settings").upsert({ key, value });
    }
    res.json({ success: true });
  });

  // Update Shop Social Links
  app.post("/api/shops/:id/social", async (req, res) => {
    const { social_links } = req.body;
    await supabase
      .from("shops")
      .update({ social_links: JSON.stringify(social_links) })
      .eq("id", req.params.id);
    res.json({ success: true });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    
    // SPA fallback: serve index.html for any non-API routes
    app.get("*", (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
