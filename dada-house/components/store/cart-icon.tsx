"use client";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./cart-provider";

export function CartIcon() {
  const { count } = useCart();
  return (
    <Link href="/store/cart" className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
      <ShoppingCart className="w-5 h-5 text-gray-700" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#F7921A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
