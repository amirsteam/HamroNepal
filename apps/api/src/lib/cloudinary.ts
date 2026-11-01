/**
 * Cloudinary, configured once. Set either CLOUDINARY_URL or the three
 * separate CLOUDINARY_* values.
 */

import { v2 as cloudinary } from "cloudinary";
import { config } from "../config";

const { url, cloudName, apiKey, apiSecret } = config.cloudinary;
const hasKeys = Boolean(cloudName && apiKey && apiSecret);
// The SDK reads CLOUDINARY_URL by itself; the separate values are set here.
if (hasKeys) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

export const cloudinaryReady = hasKeys || Boolean(url);
export { cloudinary };
