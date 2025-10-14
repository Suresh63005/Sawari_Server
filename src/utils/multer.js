const multer = require("multer");

// Initialize memory storage
const storage = multer.memoryStorage(); // Store files in RAM

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1 * 1024 * 1024, // Restrict to 1MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only JPEG, JPG, PNG, GIF, WEBP, and SVG files are allowed.")
      );
    }
    cb(null, true);
  },
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Image size must be 1MB or less.",
    });
  }
  if (
    err.message === "Only JPEG, JPG, PNG, GIF, WEBP, and SVG files are allowed."
  ) {
    return res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: err.message,
    });
  }
  next(err);
};

// Sanitize filename to create a valid S3 object key
const sanitizeFilename = (filename) => {
  // Extract the extension
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  // Get the name without extension
  let name = filename.slice(0, filename.lastIndexOf("."));
  // Replace spaces with hyphens, remove invalid characters, and limit length
  name = name
    .replace(/\s+/g, "-") // Spaces to hyphens
    .replace(/[^a-zA-Z0-9-]/g, "") // Remove special characters
    .substring(0, 100); // Limit to 100 characters
  // Add timestamp for uniqueness
  const timestamp = Date.now();
  return `${timestamp}-${name}${extension}`;
};

module.exports = { upload, handleMulterError, sanitizeFilename };
