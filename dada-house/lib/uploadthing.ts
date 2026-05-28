import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/auth";

const f = createUploadthing();

export const ourFileRouter = {
  appointmentPhotos: f({
    image: { maxFileSize: "8MB", maxFileCount: 6 },
  })
    .middleware(async () => {
      return { ok: true };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),

  reviewPhotos: f({ image: { maxFileSize: "4MB", maxFileCount: 3 } })
    .middleware(async () => ({ ok: true }))
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),

  invoicePdf: f({ pdf: { maxFileSize: "16MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user || session.user.role !== "ADMIN")
        throw new Error("Forbidden");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),

  galleryPhoto: f({ image: { maxFileSize: "16MB", maxFileCount: 10 } })
    .middleware(async () => ({ ok: true }))
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl ?? file.url };
    }),

  technicianPhoto: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => ({ ok: true }))
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl ?? file.url };
    }),

  jobPhotos: f({
    image: { maxFileSize: "16MB", maxFileCount: 10 },
    video: { maxFileSize: "64MB", maxFileCount: 2 },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl ?? file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
