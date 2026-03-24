/**
 * Constantes centralizadas da aplicação.
 * Evita duplicação de IS_SUPABASE_READY, configs do Cloudinary, etc.
 */

// ── Supabase ──────────────────────────────────────────────
export const IS_SUPABASE_READY =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Cloudinary ────────────────────────────────────────────
export const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dlmkynuni";
export const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";
export const DEFAULT_FOLDER = "store/products";

// ── Upload ────────────────────────────────────────────────
export const MAX_FILE_SIZE_MB = 8;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
