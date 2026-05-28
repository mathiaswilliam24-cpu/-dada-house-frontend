import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — DADA HOUSE",
  description: "Privacy Policy for DADA HOUSE home services in Houston, TX.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "May 24, 2025";

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-[#1B3FA8] mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {lastUpdated}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">1. Who We Are</h2>
            <p>
              DADA HOUSE LLC ("DADA HOUSE", "we", "our", or "us") provides residential and commercial
              home services — including plumbing, air conditioning, heating, and remodeling — in the
              Houston, Texas metropolitan area. Our website is{" "}
              <a href="https://mydadahouse.com" className="text-[#F7921A] hover:underline">
                mydadahouse.com
              </a>
              . You can reach us at{" "}
              <a href="mailto:customerservice@mydadahouse.com" className="text-[#F7921A] hover:underline">
                customerservice@mydadahouse.com
              </a>{" "}
              or by phone at{" "}
              <a href="tel:+19106858042" className="text-[#F7921A] hover:underline">
                +1 (910) 685-8042
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Contact information</strong>: name, email address, phone number, and service
                address when you submit a booking request or contact form.
              </li>
              <li>
                <strong>Account information</strong>: email and encrypted password if you create an
                account on our platform.
              </li>
              <li>
                <strong>Service information</strong>: details about the service requested, photos you
                upload, preferred dates, and any description of your issue.
              </li>
              <li>
                <strong>Usage data</strong>: pages visited, browser type, and IP address collected
                automatically via standard web server logs.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To schedule, confirm, and manage your service appointments.</li>
              <li>To send you appointment confirmations and status updates by email.</li>
              <li>
                <strong>To send you SMS text messages</strong> regarding your appointment status,
                scheduling updates, and service confirmations. See Section 4 for full SMS disclosure.
              </li>
              <li>To issue and send invoices for completed services.</li>
              <li>To respond to your inquiries submitted via our contact form.</li>
              <li>To improve our website and services.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">4. SMS Communications & Opt-In Consent</h2>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="font-medium text-[#1B3FA8] mb-2">SMS Opt-In Disclosure</p>
              <p>
                By submitting a booking request or appointment form on mydadahouse.com, you expressly
                consent to receive automated SMS text messages from DADA HOUSE at the phone number
                you provide. These messages may include:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Appointment confirmation messages</li>
                <li>Appointment status updates (confirmed, in progress, completed)</li>
                <li>Invoice and payment notifications</li>
                <li>Scheduling reminders</li>
              </ul>
            </div>
            <p>
              <strong>Message frequency</strong>: Message frequency varies based on your appointment
              activity. Typically 1–4 messages per appointment.
            </p>
            <p className="mt-2">
              <strong>Message & data rates may apply.</strong> Standard carrier rates apply for SMS
              messages received.
            </p>
            <p className="mt-2">
              <strong>Opt-Out</strong>: You may opt out of SMS messages at any time by replying{" "}
              <strong>STOP</strong> to any message. After opting out, you will receive one final
              confirmation message. To re-subscribe, reply <strong>START</strong>.
            </p>
            <p className="mt-2">
              <strong>Help</strong>: Reply <strong>HELP</strong> for assistance or contact us at{" "}
              <a href="mailto:customerservice@mydadahouse.com" className="text-[#F7921A] hover:underline">
                customerservice@mydadahouse.com
              </a>
              .
            </p>
            <p className="mt-2">
              We do not sell or share your phone number with third parties for their marketing purposes.
              SMS consent is not a condition of purchase.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">5. How We Share Your Information</h2>
            <p>We do not sell your personal information. We may share your information with:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <strong>Service providers</strong>: third-party tools we use to operate our business
                (email delivery via Resend, SMS via Twilio, file storage via UploadThing, database
                hosting via Supabase). These providers are contractually bound to protect your data.
              </li>
              <li>
                <strong>Legal requirements</strong>: when required by law, court order, or governmental
                authority.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide our services and
              comply with legal obligations. Appointment records are kept for a minimum of 3 years for
              business and warranty purposes. You may request deletion of your account and associated
              data by contacting us at{" "}
              <a href="mailto:customerservice@mydadahouse.com" className="text-[#F7921A] hover:underline">
                customerservice@mydadahouse.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">7. Security</h2>
            <p>
              We implement industry-standard security measures including encrypted passwords (bcrypt),
              HTTPS/TLS encryption for all data in transit, and secure database hosting. No method of
              transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Access the personal information we hold about you.</li>
              <li>Request correction of inaccurate information.</li>
              <li>Request deletion of your account and personal data.</li>
              <li>Opt out of SMS communications at any time (reply STOP).</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, email us at{" "}
              <a href="mailto:customerservice@mydadahouse.com" className="text-[#F7921A] hover:underline">
                customerservice@mydadahouse.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">9. Children's Privacy</h2>
            <p>
              Our services are not directed to individuals under 18 years of age. We do not knowingly
              collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by posting the new policy on this page with an updated date. Continued use of
              our services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#1B3FA8] mb-3">11. Contact Us</h2>
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
