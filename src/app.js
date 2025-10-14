require("module-alias/register");
const express = require("express");
const morgan = require("morgan");
const dotEnv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const hpp = require("hpp");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const loadRoutes = require("./routes/index");

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");

const app = express();
const port = process.env.PORT || 4445;

const { API_VERSION } = require("../src/api/api");

console.log(
  "🚀 Starting app.js at",
  new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
);
console.log("🌍 API Version:", API_VERSION);

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000000,
  message: "Too many requests from this IP, please try again later",
});

// Environment variables
dotEnv.config();

// Middleware
app.set("trust proxy", 1);
app.use(morgan("dev"));
app.use(express.json()); // Parse JSON bodies
console.log("✅ JSON middleware registered");
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser());
app.use(helmet());
app.use(limiter);
app.use(compression());
app.use(hpp());

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://sawari-admin.vercel.app",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Disposition"],
  })
);

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Sawari API",
      version: "1.0.0",
    },
  },
  apis: ["./src/api/*.js"],
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Load routes
(async () => {
  try {
    await loadRoutes(app);
    console.log("✅ Routes loaded successfully");
  } catch (err) {
    console.error("❌ Failed to initialize routes:", err.message);
    process.exit(1);
  }
})();

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});
const multer = require("multer");
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle file size limit error
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File size exceeds 1 MB limit." });
    }
    return res.status(400).json({ error: err.message });
  }

  // Other errors (from your controllers/services)
  if (err) {
    return res
      .status(500)
      .json({ error: err.message || "Something went wrong" });
  }

  next();
});

const startServer = async () => {
  if (process.env.NODE_ENV === "test") {
    console.log("🧪 Test mode: Skipping Redis and server startup");
    return;
  }
  try {
    const server = app.listen(port, () => {
      console.info(`🚀 Server running on port ${port}`);
      console.info(`Swagger UI available at http://localhost:${port}/api-docs`);
    });

    console.log(server.requestTimeout, "server requestTimeout");
  } catch (err) {
    console.error(`❌ Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.post("/upload-token", async (req, res) => {
  const folder = req.body.folder || "uploads";
  // const folder = "sawari-drivers-02";

  // Expect `files` as JSON string in form-data
  let files;
  try {
    files = req.body.files;
  } catch (err) {
    console.error("Invalid JSON in files field:", err.message);
    return res.status(400).json({ message: "Invalid JSON in files field" });
  }

  if (!files) {
    return res.status(400).json({ message: "files field is required" });
  }

  // Convert single object to array
  if (!Array.isArray(files)) {
    files = [files];
  }

  try {
    const results = [];

    for (const file of files) {
      const { fileName, fileType } = file;

      if (!fileName || !fileType) {
        return res
          .status(400)
          .json({ message: "Each file must have fileName and fileType" });
      }

      // ✅ Generate unique SHA-256 hash based key
      const hash = crypto.createHash("sha256");
      hash.update(fileName + Date.now().toString() + Math.random().toString());
      const hashedFileName = hash.digest("hex"); // 64 characters
      const key = `${folder}/${hashedFileName}-${fileName}`;
      // const key = `${folder}/${fileName}`;
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        ContentType: fileType,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
      const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      results.push({ uploadUrl, key, fileUrl });
    }

    return res.json({ files: results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error generating upload URLs" });
  }
});

// for delete
app.delete("/delete-image", async (req, res) => {
  const filePath = req.body.filePath;
  console.log(filePath, "kkkkkkkkkkkkkkkkkkkkkkkkkkkk");
  if (!filePath)
    return res.status(400).json({ message: "filePath is required" });

  const deleteCommand = new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: filePath,
  });

  try {
    const result = await s3.send(deleteCommand);
    res.json({ message: "File deleted successfully", result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete image" });
  }
});

module.exports = app;
