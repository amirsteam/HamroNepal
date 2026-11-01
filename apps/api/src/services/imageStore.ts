/**
 * Keep our own copy of a news photo: download it and upload it to Cloudinary,
 * so the article's image no longer depends on the outlet's server (links
 * break, or outlets refuse images to other sites).
 */

import type { UploadApiResponse } from "cloudinary";
import { cloudinary, cloudinaryReady } from "../lib/cloudinary";
import { USER_AGENT } from "../ingest/agent";

const MAX_BYTES = 10 * 1024 * 1024; // Cloudinary free-plan image limit

export interface StoredImage {
  url: string;
  publicId: string;
}

export type StoreImage = (url: string) => Promise<StoredImage | null>;

/** Upload a remote image to Cloudinary. Null when Cloudinary isn't set up; throws on failure. */
export const storeRemoteImage: StoreImage = async (url) => {
  if (!cloudinaryReady) return null;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error(`Not an image (${type})`);
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length > MAX_BYTES) throw new Error(`Image too large (${(body.length / 1048576).toFixed(1)} MB)`);

  const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "hamronepal/articles",
          resource_type: "image",
          // Big enough for the site and print; keeps storage small.
          transformation: [{ width: 1600, crop: "limit" }],
        },
        (err, result) => (err || !result ? reject(err ?? new Error("Upload failed")) : resolve(result))
      )
      .end(body);
  });
  return { url: uploaded.secure_url, publicId: uploaded.public_id };
};
