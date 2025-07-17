require('module-alias/register');
const express = require('express');
const app = express();
const morgan = require('morgan');
const dotEnv = require('dotenv');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors= require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const hpp = require("hpp")
const helmet=require("helmet")
const rateLimit=require("express-rate-limit")
const compression=require("compression")

const port = process.env.PORT || 4445;

const loadRoutes = require('./routes/index');
const { sequelize } = require('./models');




const limiter=rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
})

// Middlewares
dotEnv.config();
app.set("trust proxy", 1);
app.use(express.json());
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet())
app.use(limiter)
app.use(compression()) // Compress responses
app.use(hpp())
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4444',
  'http://localhost',
  'https://kraft-my-event-admin.vercel.app',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // ✅ include PATCH
  allowedHeaders: ['Content-Type', 'Authorization'], // ✅ optionally specify allowed headers
  exposedHeaders: ['Content-Disposition'], // ✅ expose headers if needed
};


app.use(cors(corsOptions));


(async () => {
  try {
    await loadRoutes(app);
  } catch (err) {
    console.error('❌ Failed to initialize routes:', err.message);
    process.exit(1);
  }
})();

sequelize
.sync()
.then(() => {
  console.log("Database & tables created!");
})
.catch((err) => {
  console.error("Unable to create the database:", err);
});


app.listen(port, () => {
      console.info(`🚀 Server running on port ${port}`);
      console.info(`Swagger UI available at http://localhost:${port}/api-docs`);
    });




module.exports = app;