import { CheckCircle } from "lucide-react";

interface Feature {
  title: string;
  description: string;
}

export default function ServiceFeatures({
  features,
  sectionTitle = "What We Offer",
}: {
  features: Feature[];
  sectionTitle?: string;
}) {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-black text-[#1B3FA8] mb-4">
            {sectionTitle}
          </h2>
          <p className="text-slate-500">
            Professional service at every step — from diagnosis to completion.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="service-card bg-[#F8FAFC] border border-slate-200 hover:border-[#F7921A]/40 rounded-2xl p-6"
            >
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle size={20} className="text-[#F7921A] flex-shrink-0 mt-0.5" />
                <h3 className="text-[#1B3FA8] font-bold">{feature.title}</h3>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed pl-8">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
