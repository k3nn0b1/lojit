import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// BRL currency formatter
export function formatBRL(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

// Analisa os erros do Supabase e retorna uma mensagem amigável para exibição
export function parseSupabaseError(error: any): string {
  if (!error) return "Ocorreu um erro desconhecido.";
  
  const msg = error?.message || error?.error_description || String(error);
  
  if (msg.includes("new row violates row-level security policy")) {
    return "Você não tem permissão para realizar esta ação.";
  }
  
  if (msg.includes("duplicate key value violates unique constraint")) {
    return "Este item já existe no sistema.";
  }
  
  if (msg.includes("JWT") || msg.includes("token")) {
    return "Sua sessão expirou ou é inválida. Atualize a página e tente novamente.";
  }
  
  return msg;
}

export const normalizePhone = (raw: string) => raw.replace(/\D+/g, "");

export const formatPhoneMask = (value: string) => {
  const digits = value.replace(/\D+/g, "").slice(0, 11);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 7);
  const part3 = digits.slice(7, 11);
  if (digits.length <= 2) return part1 ? `(${part1}` : "";
  if (digits.length <= 7) return `(${part1}) ${part2}`;
  return `(${part1}) ${part2}-${part3}`;
};

export const sizeOrder = ["PP", "P", "M", "G", "GG", "XG", "U"];
export const rankSize = (s: string) => {
  const idx = sizeOrder.indexOf((s || "").toUpperCase());
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
};

export const sortSizes = (arr: string[]) => [...(arr || [])].sort((a, b) => {
  const ra = rankSize(a);
  const rb = rankSize(b);
  if (ra !== rb) return ra - rb;
  return (a || "").localeCompare(b || "");
});

export const normalizeCategory = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^\x00-\x7F]/g, '').replace(/[\u0300-\u036f]/g, '');
