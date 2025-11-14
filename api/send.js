module.exports = async (req, res) => {
  // Configura CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const WEBHOOK_URL = "https://discord.com/api/webhooks/1438738516128301288/YA0y_MJbCqZVt8wslVRTleraE2o7Qr80pjXndp3MNSTY40K_0GWSUCkbYrZOCJRgBQr5";
    const SECRET_KEY = "alves_secret_2024_brazil";

    const { data, authKey, session, player } = req.body;

    // 🛡️ VERIFICAÇÃO DUPLA DE SEGURANÇA
    function isValidRequest(authKey, session, player, data) {
      // 1. Verifica chave principal
      if (authKey !== SECRET_KEY) {
        console.log('❌ Chave inválida');
        return false;
      }
      
      // 2. Verifica se a session é válida
      if (!session || session.length < 5 || session.length > 100) {
        console.log('❌ Session inválida:', session);
        return false;
      }
      
      // 3. Verifica se o player name é razoável
      if (!player || player.length < 3 || player.length > 50) {
        console.log('❌ Player name inválido:', player);
        return false;
      }
      
      // 4. Verifica se player contém apenas caracteres permitidos
      const validPlayerRegex = /^[a-zA-Z0-9_]+$/;
      if (!validPlayerRegex.test(player)) {
        console.log('❌ Player name com caracteres inválidos:', player);
        return false;
      }
      
      // 5. Verifica se os dados são válidos
      if (!data || typeof data !== 'object') {
        console.log('❌ Dados inválidos');
        return false;
      }
      
      // 6. Verifica tamanho máximo do payload
      const payloadSize = JSON.stringify(req.body).length;
      if (payloadSize > 10000) {
        console.log('❌ Payload muito grande:', payloadSize);
        return false;
      }
      
      return true;
    }

    // 🔐 RATE LIMITING SIMPLES
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const rateLimitKey = `rate_${clientIP}`;
    const MAX_REQUESTS_PER_HOUR = 15;
    
    // Simulação simples de rate limiting (em produção use Redis)
    const currentHour = Math.floor(Date.now() / 3600000);
    const rateLimitCache = new Map();
    
    if (rateLimitCache.has(rateLimitKey)) {
      const { count, hour } = rateLimitCache.get(rateLimitKey);
      if (hour === currentHour && count >= MAX_REQUESTS_PER_HOUR) {
        console.log('🚫 Rate limit excedido para IP:', clientIP);
        return res.status(429).json({ 
          error: "Muitas requisições. Tente novamente mais tarde." 
        });
      }
    }

    // 🎯 APLICA VERIFICAÇÃO DE SEGURANÇA
    if (!isValidRequest(authKey, session, player, data)) {
      console.log('❌ Requisição bloqueada por segurança');
      
      // Atualiza rate limiting mesmo para requisições inválidas
      const currentCount = rateLimitCache.get(rateLimitKey)?.count || 0;
      rateLimitCache.set(rateLimitKey, { 
        count: currentCount + 1, 
        hour: currentHour 
      });
      
      return res.status(401).json({ 
        error: "Não autorizado",
        message: "Falha na verificação de segurança"
      });
    }

    console.log('✅ Requisição autorizada de:', player, 'Session:', session);

    // 📤 ENVIA PARA DISCORD
    const discordResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    // 📊 ATUALIZA RATE LIMITING PARA REQUISIÇÕES VÁLIDAS
    const currentCount = rateLimitCache.get(rateLimitKey)?.count || 0;
    rateLimitCache.set(rateLimitKey, { 
      count: currentCount + 1, 
      hour: currentHour 
    });

    if (discordResponse.ok) {
      console.log('📤 Mensagem enviada para Discord - Player:', player);
      return res.status(200).json({ 
        success: true,
        message: "Dados enviados com sucesso",
        rateLimit: {
          remaining: Math.max(0, MAX_REQUESTS_PER_HOUR - (currentCount + 1)),
          reset: currentHour + 1
        }
      });
    } else {
      const errorText = await discordResponse.text();
      console.error('❌ Erro do Discord - Player:', player, 'Erro:', errorText);
      return res.status(500).json({ 
        error: "Erro ao enviar para Discord",
        details: "Webhook pode estar inválido"
      });
    }

  } catch (error) {
    console.error('💥 Erro interno no servidor:', error);
    return res.status(500).json({ 
      error: "Erro interno do servidor",
      details: process.env.NODE_ENV === 'production' ? 'Internal error' : error.message
    });
  }
};
