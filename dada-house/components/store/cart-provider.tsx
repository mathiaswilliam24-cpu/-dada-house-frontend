"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type CartItem = { productId: string; name: string; price: number; quantity: number; image?: string };
type CartContext = {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  loading: boolean;
};

const CartCtx = createContext<CartContext | null>(null);
const STORAGE_KEY = "dada-house-cart";

function load(): CartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}

function save(items: CartItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* empty */ }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setItems(load()); setLoading(false); }, []);

  function update(next: CartItem[]) { setItems(next); save(next); }

  function addItem(product: Omit<CartItem, "quantity">) {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.productId);
      const next = existing
        ? prev.map(i => i.productId === product.productId ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...product, quantity: 1 }];
      save(next);
      return next;
    });
  }

  function removeItem(productId: string) { update(items.filter(i => i.productId !== productId)); }

  function updateQuantity(productId: string, qty: number) {
    if (qty <= 0) return removeItem(productId);
    update(items.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
  }

  function clearCart() { update([]); }

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartCtx.Provider value={{ items, count, total, addItem, removeItem, updateQuantity, clearCart, loading }}>
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
