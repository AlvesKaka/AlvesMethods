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
    
    // 🔐 CHAVE FIXA
    const SECRET_KEY = "alves_Xp9$kLm2Q8zRwE5tY6uHjN4bV7cF3gT1";

    const { data, authKey, session, player } = req.body;

    // Verificação simples
    if (!authKey || authKey !== SECRET_KEY) {
      console.log('❌ Chave inválida');
      return res.status(401).json({ error: "Não autorizado" });
    }

    if (!data) {
      return res.status(400).json({ error: "Dados faltando" });
    }

    console.log('✅ Requisição autorizada de:', player);

    // Envia para Discord
    const discordResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (discordResponse.ok) {
      console.log('✅ Mensagem enviada para Discord');
      return res.status(200).json({ 
        success: true,
        message: "Dados enviados com sucesso"
      });
    } else {
      const errorText = await discordResponse.text();
      console.error('❌ Erro do Discord:', errorText);
      return res.status(500).json({ 
        error: "Erro ao enviar para Discord"
      });
    }

  } catch (error) {
    console.error('💥 Erro interno:', error);
    return res.status(500).json({ 
      error: "Erro interno do servidor"
    });
  }
};
