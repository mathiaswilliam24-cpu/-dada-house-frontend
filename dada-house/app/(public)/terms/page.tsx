import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — DADA HOUSE",
  description: "Terms and Conditions for DADA HOUSE home services in Houston, TX.",
};

export default function TermsPage() {
  const lastUpdated = "May 24, 2025";

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-[#1B3FA8] mb-2">
          Terms & Conditions
        </h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {lastUpdated}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing our website at{" "}
              <a href="https://mydadahouse.com" className="text-[#F7921A] hover:underline">
                mydadahouse.com
              </a>{" "}
              or using any of our services, you agree to be bound by these Terms & Conditions. If you
              do not agree, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">2. Services</h2>
            <p>
              DADA HOUSE LLC provides residential and commercial home services in the Houston, Texas
              metropolitan area, including but not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Plumbing installation, repair, and maintenance</li>
              <li>Air conditioning installation, repair, and maintenance</li>
              <li>Heating systems installation, repair, and maintenance</li>
              <li>Home remodeling and renovation</li>
            </ul>
            <p className="mt-2">
              Services are available 24 hours a day, 7 days a week including holidays.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">3. Booking & Appointments</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Submitting a booking request on our website does not guarantee an appointment. We will
                contact you to confirm availability.
              </li>
              <li>
                You agree to provide accurate contact information, service address, and description of
                the issue.
              </li>
              <li>
                We reserve the right to refuse service at our discretion.
              </li>
              <li>
                Cancellations must be made at least 2 hours before the scheduled appointment. Late
                cancellations may incur a fee.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">4. SMS Communications</h2>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p>
                By submitting a booking form on mydadahouse.com, you consent to receive SMS text
                messages from DADA HOUSE at the mobile number provided. These messages relate to your
                appointment status, confirmations, and service updates.
              </p>
              <p className="mt-2">
                <strong>To opt out</strong>, reply <strong>STOP</strong> to any SMS message.
                Message & data rates may apply. Message frequency varies. Reply <strong>HELP</strong>{" "}
                for support.
              </p>
              <p className="mt-2">
                Full details are in our{" "}
                <a href="/privacy-policy" className="text-[#F7921A] hover:underline">
                  Privacy Policy — Section 4
                </a>
                .
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">5. Pricing & Payment</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Estimates provided before service are approximate. Final pricing may vary based on the
                actual scope of work discovered on-site.
              </li>
              <li>
                Payment is due upon completion of service unless otherwise agreed in writing.
              </li>
              <li>
                We accept cash, check, and major credit/debit cards.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">6. Warranty</h2>
            <p>
              DADA HOUSE warrants all labor performed for a period of 90 days from the date of service
              completion. Parts and materials are subject to manufacturer warranties. This warranty does
              not cover damage caused by misuse, neglect, or acts of nature.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">7. Limitation of Liability</h2>
            <p>
              DADA HOUSE's liability for any claim arising from our services shall not exceed the amount
              paid for the specific service giving rise to the claim. We are not liable for indirect,
              incidental, or consequential damages. We carry general liability insurance and all
              technicians are licensed and insured.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">8. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. You
              agree to notify us immediately of any unauthorized use of your account. We reserve the
              right to terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">9. Reviews & Content</h2>
            <p>
              By submitting a review on our platform, you grant DADA HOUSE a non-exclusive, royalty-free
              license to display that review on our website and marketing materials. Reviews must be
              truthful and based on your genuine experience. We reserve the right to moderate and
              remove reviews that are fraudulent, defamatory, or violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">10. Intellectual Property</h2>
            <p>
              All content on mydadahouse.com — including text, images, logos, and code — is the property
              of DADA HOUSE LLC and protected by applicable intellectual property laws. You may not
              reproduce or distribute any content without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Texas, United States. Any disputes
              shall be resolved in the courts of Harris County, Texas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">12. Changes to Terms</h2>
            <p>
              We reserve the right to update these Terms at any time. Continued use of our services
              after changes constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">13. Contact</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-[#1B3FA8]">DADA HOUSE LLC</p>
              <p>Houston, Texas</p>
              <p>
                Email:{" "}
                <a href="mailto:customerservice@mydadahouse.com" className="text-[#F7921A] hover:underline">
                  customerservice@mydadahouse.com
                </a>
              </p>
              <p>
                Phone:{" "}
                <a href="tel:+19106858042" className="text-[#F7921A] hover:underline">
                  +1 (910) 685-8042
                </a>
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
