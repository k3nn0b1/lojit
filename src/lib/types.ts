/**
 * Tipos compartilhados da aplicação.
 * Substitui o uso excessivo de `any` por tipagem forte.
 */

// ── Produto ───────────────────────────────────────────────
export interface AdminProduct {
  id?: number;
  name: string;
  category: string;
  price: number;
  sizes: string[];
  stock?: number;
  stockBySize?: Record<string, number>;
  image?: string;
  imageUrl?: string;
  publicId?: string;
  image2?: string;
  imageUrl2?: string;
  publicId2?: string;
  image3?: string;
  imageUrl3?: string;
  publicId3?: string;
  description?: string;
  colors?: ProductColor[];
  tenant_id?: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Color {
  id?: number;
  name: string;
  hex: string;
  tenant_id?: string;
}

// ── Pedido ────────────────────────────────────────────────
export type PedidoStatus =
  | "pendente"
  | "concluido"
  | "cancelado"
  | "devolvido"
  | "parcialmente_devolvido";

export interface PedidoItem {
  produto: string;
  tamanho: string;
  cor?: string | null;
  quantidade: number;
  product_id: number;
  preco_unitario: number;
  devolvido?: number;
}

export interface Pedido {
  id: string;
  cliente_nome: string;
  cliente_telefone: string;
  itens: PedidoItem[];
  valor_total: number;
  status: PedidoStatus;
  data_criacao: string;
  tenant_id: string;
}

// ── Carrinho Admin ────────────────────────────────────────
export interface AdminCartItem {
  id: number;
  name: string;
  size: string;
  color?: string;
  quantity: number;
  price: number;
}

// ── Cliente ───────────────────────────────────────────────
export interface Cliente {
  id?: string;
  nome: string;
  telefone: string;
  tenant_id: string;
  created_at?: string;
}
