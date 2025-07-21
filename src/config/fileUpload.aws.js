const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  maxAttempts: 5,
});

/**
 * Upload file(s) to AWS S3
 * @param {Express.Multer.File|Array<Express.Multer.File>} file - Single or multiple files
 * @param {string} folderName - Folder in S3 bucket
 * @returns {Promise<string|string[]>} - Uploaded file URL(s)
 */
const uploadToS3 = async (file, folderName = "uploads") => {
  if (!file || (Array.isArray(file) && file.length === 0)) {
    throw new Error("No file provided for upload.");
  }

  const files = Array.isArray(file) ? file : [file];

  const uploadPromises = files.map(async (f) => {
    const fileName = `${folderName}/${Date.now()}-${path.basename(f.originalname)}`;
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: f.buffer,
      ContentType: f.mimetype,
    };

    try {
      await s3.send(new PutObjectCommand(params));
      return `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
    } catch (error) {
      console.error(`❌ Upload failed for ${f.originalname}:`, error);
      throw new Error(`Failed to upload file ${f.originalname} to S3.`);
    }
  });

  const uploaded = await Promise.all(uploadPromises);
  return uploaded.length === 1 ? uploaded[0] : uploaded;
};

/**
 * Delete a file from AWS S3
 * @param {string} imageUrl - Full S3 file URL
 * @returns {Promise<void>}
 */
const deleteFromS3 = async (imageUrl) => {
  if (!imageUrl) return;

  try {
    const url = new URL(imageUrl);
    const Key = decodeURIComponent(url.pathname.slice(1)); // Remove leading slash

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key,
    };

    await s3.send(new DeleteObjectCommand(params));
    console.log(`✅ Deleted file from S3: ${Key}`);
  } catch (error) {
    console.error(`❌ Error deleting from S3 [${imageUrl}]:`, error.message);
    throw new Error("Failed to delete image from S3");
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3,
};