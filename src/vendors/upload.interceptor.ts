import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { Request } from "express";

/**
 * Multer + S3 Upload Configuration
 * Production Ready (20MB limit)
 */
export const multerOptions = (s3: S3Client) => ({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME || "magikworldgifts",
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,

    key: (req: Request, file: Express.Multer.File, cb: Function) => {
      const fileName = `vendors/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),

  // ✅ FILE SIZE LIMIT (20MB)
  limits: {
    fileSize: 20 * 1024 * 1024,
  },

  // ✅ FILE TYPE VALIDATION
  fileFilter: (req: Request, file: Express.Multer.File, cb: Function) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }

    cb(null, true);
  },
});