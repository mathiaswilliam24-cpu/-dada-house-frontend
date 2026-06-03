"use client";
import { useEffect, useState } from "react";
import { Save, Upload, Loader2, Eye, Images, Monitor, CheckCircle, ExternalLink, X } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing-components";

type GalleryProject = { id: string; title: string; category: string; images: string[]; published: boolean };

type Tab = "hero" | "gallery";

export default function SiteContentPage() {
  const [tab, setTab] = useState<Tab>("hero");

  // Hero state
  const [currentHero, setCurrentHero] = useState("/team.jpg");
  const [previewHero, setPreviewHero] = useState<string | null>(null);
  const [savingHero, setSavingHero] = useState(false);
  const [heroSaved, setHeroSaved] = useState(false);

  // Gallery state
  const [projects, setProjects] = useState<GalleryProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [settingsRes, galRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/gallery"),
      ]);
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setCurrentHero(s["site.heroImage"] || "/team.jpg");
      }
      if (galRes.ok) {
        const g = await galRes.json();
        setProjects(g.projects ?? []);
      }
      setLoadingProjects(false);
    }
    load();
  }, []);

  async function publishHero() {
    if (!previewHero) return;
    setSavingHero(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "site.heroImage": previewHero }),
    });
    setCurrentHero(previewHero);
    setPreviewHero(null);
    setSavingHero(false);
    setHeroSaved(true);
    setTimeout(() => setHeroSaved(false), 3000);
  }

  async function togglePublish(id: string, published: boolean) {
    setSaving(true);
    await fetch(`/api/admin/gallery/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    setProjects(prev => prev.map(p => p.id === id ? { ...p, published: !published } : p));
    setSaving(false);
  }

  const displayHero = previewHero ?? currentHero;
  const publishedProjects = projects.filter(p => p.published && p.images.length > 0);
  const homepageProjects = publishedProjects.slice(0, 6);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Site Content</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage photos visible on the public website — preview before publishing</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([["hero", "Hero Image", Monitor], ["gallery", "Homepage Gallery", Images]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── HERO TAB ── */}
      {tab === "hero" && (
        <div className="space-y-5">
          {/* Upload + status */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-1">Hero Background Image</h2>
            <p className="text-sm text-gray-500 mb-5">
              This is the full-width photo behind the hero section on the homepage.
              Upload a new image to preview it — it won't go live until you click <strong>Publish</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 min-w-[200px]">
                <Upload className="w-5 h-5 text-gray-400" />
                <p className="text-xs text-gray-500">JPG / PNG / WebP — max 16MB</p>
                <UploadButton
                  endpoint="siteImages"
                  onClientUploadComplete={(res) => {
                    const url = res[0]?.ufsUrl ?? res[0]?.url;
                    if (url) setPreviewHero(url);
                  }}
                  appearance={{
                    button: "bg-[#1B3FA8] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#1B3FA8]/90 ut-uploading:opacity-60",
                    allowedContent: "hidden",
                  }}
                />
              </div>

              {previewHero && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <Eye className="w-4 h-4" />
                    New image uploaded — preview below, not yet live
                  </div>
                  <div className="flex gap-2">
                    <button onClick={publishHero} disabled={savingHero}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors">
                      {savingHero ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Publish Now
                    </button>
                    <button onClick={() => setPreviewHero(null)}
                      className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {heroSaved && (
                <div className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4" /> Hero image published!
                </div>
              )}
            </div>

            {/* PREVIEW */}
            <div className="rounded-2xl overflow-hidden border-4 border-gray-200 relative">
              <div className="absolute top-3 left-3 z-10 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {previewHero ? "⚡ PREVIEW (not live)" : "✓ LIVE"}
              </div>
              {/* Mini hero preview */}
              <div className="relative h-64 sm:h-80">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url('${displayHero}')` }} />
                <div className="absolute inset-0 bg-[#1B3FA8]/30" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0D1D5E]/80 to-transparent" />
                <div className="relative h-full flex flex-col items-center justify-center px-6 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#F7921A]/10 border border-[#F7921A]/30 rounded-full mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[#F7921A] text-xs font-bold uppercase tracking-wide">Available 24/7</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">DADA HOUSE</h2>
                  <p className="text-blue-200 text-sm mb-4">Professional Home Services — Houston TX</p>
                  <div className="flex gap-3">
                    <div className="px-4 py-2 bg-[#F7921A] text-white text-xs font-bold rounded-xl">Book Appointment</div>
                    <div className="px-4 py-2 bg-white/10 border border-white/30 text-white text-xs font-bold rounded-xl">Call Now</div>
                  </div>
                </div>
              </div>
            </div>

            {previewHero && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                The image above shows the preview. The live site still shows the old image until you click <strong>Publish Now</strong>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── GALLERY TAB ── */}
      {tab === "gallery" && (
        <div className="space-y-5">
          {/* Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-gray-900">Homepage Gallery</h2>
              <a href="/admin/gallery" target="_blank"
                className="inline-flex items-center gap-1.5 text-sm text-[#1B3FA8] font-semibold hover:underline">
                Manage Gallery <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              The homepage shows the first <strong>6 published gallery projects</strong> that have photos.
              Publish or unpublish projects below to control what visitors see.
              {" "}<strong>{publishedProjects.length}</strong> published with photos.
            </p>

            {/* Homepage preview grid */}
            {homepageProjects.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Homepage preview ({homepageProjects.length} photos)</p>
                <div className="grid grid-cols-3 gap-2 rounded-xl overflow-hidden border border-gray-200">
                  {homepageProjects.map((p) => (
                    <div key={p.id} className="relative aspect-square bg-gray-100 overflow-hidden">
                      <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-white text-xs font-semibold truncate">{p.title}</p>
                      </div>
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 6 - homepageProjects.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
                      <p className="text-xs text-gray-300">Empty slot</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All projects list */}
            {loadingProjects ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#1B3FA8]" /></div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <Images className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No gallery projects yet.</p>
                <a href="/admin/gallery" className="text-sm text-[#1B3FA8] font-semibold hover:underline">
                  Go to Gallery to add projects →
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">All projects ({projects.length})</p>
                {projects.map((p) => (
                  <div key={p.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${p.published ? "border-green-200 bg-green-50/50" : "border-gray-100 bg-gray-50"}`}>
                    {p.images[0] ? (
                      <img src={p.images[0]} alt={p.title} className="w-12 h-12 object-cover rounded-lg border border-gray-200 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        <Images className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{p.title}</p>
                      <p className="text-xs text-gray-400">{p.category} · {p.images.length} photo{p.images.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.images.length === 0 && (
                        <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">No photos</span>
                      )}
                      {p.published && homepageProjects.includes(p) && (
                        <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-semibold">On Homepage</span>
                      )}
                      <button onClick={() => togglePublish(p.id, p.published)} disabled={saving || p.images.length === 0}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-40 ${p.published ? "bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200" : "bg-[#1B3FA8] text-white hover:bg-[#1B3FA8]/90"}`}>
                        {p.published ? "Unpublish" : "Publish"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
