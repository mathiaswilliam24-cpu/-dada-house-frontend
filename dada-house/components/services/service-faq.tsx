interface Faq {
  question: string;
  answer: string;
}

// Renders visible FAQ content plus matching FAQPage JSON-LD — this is what lets an AI
// assistant (or a Google rich result) pull a direct answer instead of just a link.
export default function ServiceFaq({ faqs }: { faqs: Faq[] }) {
  return (
    <section className="py-20 bg-[#F8FAFC]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-black text-[#1B3FA8] mb-10 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.question} className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="text-[#1B3FA8] font-bold mb-2">{faq.question}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          }),
        }}
      />
    </section>
  );
}
