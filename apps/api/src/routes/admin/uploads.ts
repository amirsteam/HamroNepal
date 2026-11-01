import { Router } from "express";
import multer from "multer";
import type { UploadApiResponse } from "cloudinary";
import { HttpError, badRequest } from "../../lib/http";
import { cloudinary, cloudinaryReady } from "../../lib/cloudinary";

export const adminUploadsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  // 10 MB: full-page print ads at 300 dpi (Cloudinary's free-plan image limit).
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype));
  },
});

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
