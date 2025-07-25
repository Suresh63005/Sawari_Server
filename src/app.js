require('module-alias/register');
const express = require('express');
const morgan = require('morgan');
const dotEnv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const hpp = require('hpp');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { sequelize } = require('./models');
const loadRoutes = require('./routes/index');
const reddisConnect = require("./config/connectRedis");
const CacheManager=require("./utils/cache-manager");


const app = express();
const port = process.env.PORT || 4445;

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000,
  message: 'Too many requests from this IP, please try again later',
});

// Environment variables
dotEnv.config();

// Middleware
app.set('trust proxy', 1);
app.use(morgan('dev'));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser());
app.use(helmet());
app.use(limiter);
app.use(compression());
app.use(hpp());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],
}));

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sawari API',
      version: '1.0.0',
    },
  },
  apis: ['./src/api/*.js'],
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Load routes
(async () => {
  try {
    await loadRoutes(app);
    console.log('✅ Routes loaded successfully');
  } catch (err) {
    console.error('❌ Failed to initialize routes:', err.message);
    process.exit(1);
  }
})();


// Database sync
// sequelize
// .sync({alter:true})
// .then(() => {
//   console.log("Database & tables created!");
// })
// .catch((err) => {
//   console.error("Unable to create the database:", err);
// });

// Ride.sync({ alter: true })
//   .then(() => {
//     console.log("✅ Ride table synced successfully.");
//   })
//   .catch((err) => {
//     console.error("❌ Failed to sync Ride table:", err);
//   });

const startServer = async () => {
  if (process.env.NODE_ENV === 'test') {
    console.log("🧪 Test mode: Skipping Redis and server startup");
    return;
  }
  let redisClient;
  try {
    // await dbConnect();
    redisClient = await reddisConnect();
    app.locals.redisClient = redisClient;

    app.locals.cacheManager =new CacheManager(redisClient)

    const server = app.listen(port, () => {
      console.info(`🚀 Server running on port ${port}`);
      console.info(`Swagger UI available at http://localhost:${port}/api-docs`);
    });

    const shutdown = async () => {
      console.info('🛑 Shutting down server...');
      try {
        // await dbConnect.disconnect?.();
        await redisClient.quit();
        server.close(() => {
          console.info('✅ Server shut down successfully');
          process.exit(0);
        });
      } catch (err) {
        console.error('❌ Error during shutdown:', err.message);
        process.exit(1);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error(`❌ Failed to start server: ${err.message}`);
    if (redisClient) await redisClient.quit();
    process.exit(1);
  }
};

startServer()

module.exports = app;