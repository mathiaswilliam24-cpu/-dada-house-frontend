const galleryItems = [
  {
    title: "Kitchen Renovation",
    category: "Remodeling",
    color: "from-orange-900/40 to-orange-950/20",
  },
  {
    title: "AC Installation",
    category: "Air Conditioning",
    color: "from-cyan-900/40 to-cyan-950/20",
  },
  {
    title: "Bathroom Upgrade",
    category: "Plumbing",
    color: "from-blue-900/40 to-blue-950/20",
  },
  {
    title: "Furnace Repair",
    category: "Heating",
    color: "from-red-900/40 to-red-950/20",
  },
  {
    title: "Flooring Install",
    category: "Remodeling",
    color: "from-purple-900/40 to-purple-950/20",
  },
  {
    title: "Pipe Installation",
    category: "Plumbing",
    color: "from-teal-900/40 to-teal-950/20",
  },
];

export default function GallerySection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 bg-[#F7921A]/10 border border-[#F7921A]/30 text-[#F7921A] text-xs font-bold rounded-full uppercase tracking-wider mb-4">
            Our Work
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1B3FA8] mb-4">
            Project Gallery
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            See the quality of our work across Houston homes — from quick
            repairs to full renovations.
          </p>
        </div>

        {/* Gallery grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galleryItems.map((item, i) => (
            <div
              key={i}
              className={`relative bg-gradient-to-br ${item.color} bg-[#1B3FA8] border border-[#1A3490] rounded-2xl overflow-hidden aspect-square group cursor-pointer`}
            >
              {/* Placeholder visual */}
              <div className="absolute inset-0 flex items-end p-5">
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  <span className="block text-xs text-[#F7921A] font-bold uppercase tracking-wider mb-1">
                    {item.category}
                  </span>
                  <span className="block text-white font-bold text-lg">
                    {item.title}
                  </span>
                </div>
              </div>

              {/* Category badge */}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-[#1B3FA8]/80 backdrop-blur rounded-full text-xs text-[#F7921A] font-bold border border-[#F7921A]/20">
                  {item.category}
                </span>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-[#F7921A]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Title always visible at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#1B3FA8]/90 to-transparent">
                <span className="text-white text-sm font-semibold">{item.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
