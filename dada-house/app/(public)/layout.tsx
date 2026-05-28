import AnnouncementBar from "@/components/layout/announcement-bar";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import NextAuthProvider from "@/components/layout/session-provider";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextAuthProvider>
      <div className="sticky top-0 z-50 flex flex-col">
        <AnnouncementBar />
        <Header />
      </div>
      <main className="flex-1">{children}</main>
      <Footer />
    </NextAuthProvider>
  );
}
