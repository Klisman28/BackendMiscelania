const express = require('express');
const cors = require('cors');
const apiRouter = require('./routes/api');
const { logErrors, errorHandler, boomErrorHandler, ormErrorHandler } = require('./middlewares/error.handler');
const { Sequelize } = require('sequelize'); // Asegúrate de que estás importando Sequelize
require('dotenv').config(); // Cargar las variables de entorno

const app = express();
const port = 3000;

// Lista de orígenes permitidos
const allowedOrigins = [
  'http://localhost:3005',
  'http://localhost:3006',
  'http://127.0.0.1:3005',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.1.48:3005',
  'https://main.d7drqxc8d92jq.amplifyapp.com',
  'http://146.190.127.243:3000',
  'http://MiscelaniaLis',
  'https://www.miscelanialis.shop',
  'https://miscelanialis.shop',
  'https://main.d19bqybnclb2c8.amplifyapp.com'
];

// Opciones de configuración de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Si el origen está en la lista de permitidos o es undefined (por herramientas como Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error('Bloqueado por CORS. Origen:', origin);
      callback(new Error(`No permitido por CORS. El origen '${origin}' no está en la lista de permitidos.`));
    }
  },
  methods: 'GET,POST,PUT,DELETE', // Métodos permitidos
  allowedHeaders: 'Content-Type,Authorization', // Cabeceras permitidas
  credentials: true, // Permitir credenciales (cookies, tokens, etc.)
};

// Usar CORS con las opciones configuradas
app.use(cors(corsOptions));

app.use(express.json());

// Autenticación
require('./utils/auth');

// Ruta principal
app.get('/', (req, res) => {
  res.send('BAckend de Klisman ');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Rutas de la API
apiRouter(app);

// Manejo de errores
app.use(logErrors);
app.use(ormErrorHandler);
app.use(boomErrorHandler);
app.use(errorHandler);

// Configuración de la base de datos con Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  dialectModule: require('mysql2'),
  port: process.env.DB_PORT,
  logging: msg => console.log('[SQL]', msg), // Movido al nivel correcto
  dialectOptions: {
    ssl: {
      rejectUnauthorized: false, // aunque no se use SSL, esto evita errores cuando se intenta forzar
    },
  },
});

// Verificar la conexión a la base de datos antes de iniciar el servidor
sequelize.authenticate()
  .then(() => {
    console.log('Connection to the database has been established successfully.');

    // Iniciar servidor solo si la conexión a la base de datos es exitosa
    app.listen(port, () => {
      console.log('Servidor corriendo en el puerto', 'http://localhost:' + port);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });
