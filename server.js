import express from 'express';
import cors from 'cors';          // ← nuevo import

const app = express();

// ¡Esto es lo importante! Activa CORS para TODOS los orígenes (*)
app.use(cors({
  origin: '*',                    // permite cualquier origen (incluyendo null/file://)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false
}));

// Opcional: manejo manual de OPTIONS (por si acaso)
app.options('*', cors());        // responde correctamente a preflights

app.use(express.json());

// Tus variables de entorno
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SECRET_PATH = process.env.SECRET_PATH || 'send';

// Validación básica de seguridad
if (!TELEGRAM_TOKEN || !CHAT_ID) {
  console.error('Faltan variables de entorno: TELEGRAM_TOKEN y/o TELEGRAM_CHAT_ID');
  process.exit(1);
}

app.post(`/${SECRET_PATH}`, async (req, res) => {
  try {
    const body = req.body;

    if (!body || !body.text) {
      return res.status(400).json({ ok: false, error: 'Falta texto del mensaje' });
    }

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,              // mantiene parse_mode, reply_markup, etc.
        chat_id: CHAT_ID,     // forzamos nuestro chat secreto
      }),
    });

    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error enviando a Telegram:', error);
    res.status(500).json({ ok: false, error: 'Error interno del proxy' });
  }
});

// Ruta de health check (útil para Render)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Proxy Telegram escuchando en puerto ${PORT}`);
  console.log(`Endpoint: /${SECRET_PATH}`);
});
