import Link from "next/link";
import { ShoppingBag, Home } from "lucide-react";
import { CartProvider } from "@/components/store/cart-provider";
import { CartIcon } from "@/components/store/cart-icon";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 text-[#1B3FA8] font-bold text-lg">
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">DADA HOUSE</span>
              </Link>
              <Link href="/store" className="flex items-center gap-2 text-gray-700 hover:text-[#1B3FA8] font-semibold transition-colors">
                <ShoppingBag className="w-4 h-4" />
                Store
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex items-center gap-4 text-sm text-gray-600">
                {["HVAC", "Plumbing", "Tools", "Service Plans"].map((cat) => (
                  <Link key={cat} href={`/store/${cat.toLowerCase().replace(" ", "-")}`} className="hover:text-[#1B3FA8] transition-colors">
                    {cat}
                  </Link>
                ))}
              </nav>
              <CartIcon />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-200 bg-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} DADA HOUSE · Houston, TX · <a href="tel:+19106858042" className="hover:text-[#1B3FA8]">+1 (910) 685-8042</a>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
