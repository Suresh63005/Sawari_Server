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
const Ticket = require('./models/ticket.model');

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
  'http://localhost:3001',
  'http://localhost:3002',
  'https://sawari-admin.vercel.app',
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

// Ticket.sync({ alter: true })
//   .then(() => {
//     console.log("✅ Ticket table synced successfully.");
//   })
//   .catch((err) => {
//     console.error("❌ Failed to sync Ticket table:", err);
//   });

const multer = require('multer');
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle file size limit error
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 1 MB limit.' });
    }
    return res.status(400).json({ error: err.message });
  }

  // Other errors (from your controllers/services)
  if (err) {
    return res.status(500).json({ error: err.message || 'Something went wrong' });
  }

  next();
});

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

const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
})

// AWS S3 Presigned URL for Image Uploads
app.post("/upload-token", async (req, res) => {
    const timeStamp = Math.floor(Date.now() / 1000);
    const folder = req.body.folder || "uploads";
    const fileName = req.body.fileName;
    const fileType = req.body.fileType;

    console.log(timeStamp, folder, fileName, fileType, "before uploading.........");
    // recived filetype and filename 
    if (!fileType || !fileName) {
        return res.status(400).json({ message: "fileName and fileType are required" });
    }

    // define key path for s3 bucket
    const key = `${folder}/${fileName}`;
    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        ContentType: fileType
    });

    try {
        // Generate the presigned URL with a 5-minute expiration time
        const url = await getSignedUrl(s3, command, { expiresIn: 300 });
        // Return the presigned URL and additional data to the client
        return json({
            uploadUrl: url,
            bucket: process.env.S3_BUCKET_NAME,
            fileType: key
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error generating upload URL' });
    }
})

// for delete
app.delete("/delete-image", async (req, res) => {
    const filePath = req.body.filePath;
    console.log(filePath, "kkkkkkkkkkkkkkkkkkkkkkkkkkkk")
    if (!filePath) return res.status(400).json({ message: 'filePath is required' });

    const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: filePath
    });

    try {
        const result = await s3.send(deleteCommand);
        res.json({ message: 'File deleted successfully', result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete image' });
    }
})

module.exports = app;
