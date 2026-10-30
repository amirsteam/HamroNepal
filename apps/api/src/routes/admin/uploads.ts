import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { config } from "../../config";
import { HttpError, badRequest } from "../../lib/http";

export const adminUploadsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype));
  },
});

const { url, cloudName, apiKey, apiSecret } = config.cloudinary;
const hasKeys = Boolean(cloudName && apiKey && apiSecret);
// The SDK reads CLOUDINARY_URL by itself; the separate values are set here.
if (hasKeys) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}
const cloudinaryReady = hasKeys || Boolean(url);

// POST /admin/uploads (multipart field "file") → { url, publicId }
adminUploadsRouter.post("/", upload.single("file"), async (req, res) => {
  if (!cloudinaryReady) {
    throw new HttpError(503, "छवि भण्डारण (Cloudinary) कन्फिगर गरिएको छैन।");
  }
  if (!req.file) throw badRequest("JPG, PNG, WEBP, GIF वा AVIF छवि मात्र अपलोड गर्नुहोस्।");

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: "hamronepal/articles", resource_type: "image" }, (err, out) =>
        err || !out ? reject(err ?? new Error("Upload failed")) : resolve(out)
      )
      .end(req.file!.buffer);
  });

  res.status(201).json({ url: result.secure_url, publicId: result.public_id });
});
