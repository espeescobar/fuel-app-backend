import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env";

const resolvedUploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR ?? "uploads");

function ensureDir() {
  if (!fs.existsSync(resolvedUploadDir)) fs.mkdirSync(resolvedUploadDir, { recursive: true });
}

export const imageMulterDisk = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureDir();
      cb(null, resolvedUploadDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      const safeExt = ext.toLowerCase().replace(/[^.a-z0-9]/g, "");
      cb(null, `reading_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`);
    }
  }),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("invalid_file_type"), ok);
  }
});

export const imageMulterMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("invalid_file_type"), ok);
  }
});

