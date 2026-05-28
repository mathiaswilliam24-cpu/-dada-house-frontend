"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const sync = useCallback(async (newItems: CartItem[]) => {
    await fetch("/api/store/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: newItems }),
    });
  }, []);

  useEffect(() => {
    fetch("/api/store/cart")
      .then((r) => r.json())
      .then((d) => { setItems(d.items ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function addItem(product: Omit<CartItem, "quantity">) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.productId);
      const next = existing
        ? prev.map((i) => i.productId === product.productId ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...product, quantity: 1 }];
      sync(next);
      return next;
    });
  }

  function removeItem(productId: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.productId !== productId);
      sync(next);
      return next;
    });
  }

  function updateQuantity(productId: string, qty: number) {
    if (qty <= 0) return removeItem(productId);
    setItems((prev) => {
      const next = prev.map((i) => i.productId === productId ? { ...i, quantity: qty } : i);
      sync(next);
      return next;
    });
  }

  function clearCart() {
    setItems([]);
    sync([]);
  }

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
