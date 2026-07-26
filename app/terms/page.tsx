import type { Metadata } from "next";
import { BackButton } from "@/components/BackButton";

export const metadata: Metadata = {
  title: "Terms of Use | Mogifi AI",
  description: "Terms of Use for Mogifi AI",
};

export default function TermsPage() {
  const updatedAt = "May 6, 2026";

  return (
    <main className="min-h-screen bg-black text-white px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <BackButton />
      </div>
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Use</h1>
        <p className="mt-2 text-sm text-gray-300">Last Updated: {updatedAt}</p>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
          <p>
            By downloading, installing, or using Mogifi AI (&quot;the App&quot;), you agree to be bound by these
            Terms of Use and Apple&apos;s standard{" "}
            <a
              className="text-blue-300 underline underline-offset-2"
              href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
              target="_blank"
              rel="noopener noreferrer"
            >
              End User License Agreement (EULA)
            </a>
            . If you do not agree, do not use the App.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">2. Subscription Terms</h2>
          <p>
            Mogifi AI offers the following auto-renewable subscription plans through Apple In-App Purchases:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold text-white">Monthly Plan:</span> £2.99 per month. Includes a
              3-day free trial for new subscribers.
            </li>
            <li>
              <span className="font-semibold text-white">Yearly Plan:</span> £29.99 per year (~£2.50/month).
              Includes a 3-day free trial for new subscribers.
            </li>
          </ul>
          <p>
            Prices may vary by region as displayed on the App Store at the time of purchase. Payment will be
            charged to your Apple ID account at confirmation of purchase. Subscriptions automatically renew
            unless auto-renew is turned off at least 24 hours before the end of the current period. Your
            account will be charged for renewal within 24 hours prior to the end of the current period at the
            same price. You can manage and cancel subscriptions in your App Store account settings after purchase.
            Any unused portion of a free trial period will be forfeited when a subscription is purchased.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">3. Subscription Features</h2>
          <p>A Mogifi AI subscription unlocks all premium features, including:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>AI-generated personalized workout plans</li>
            <li>Personalized nutrition and macro plans</li>
            <li>AI-powered fitness consultation</li>
            <li>Food scanning and calorie tracking</li>
            <li>Addiction and phone usage tracking</li>
            <li>Progress tracking and analytics</li>
            <li>Unlimited plan modifications</li>
          </ul>
          <p>
            All features listed above require an active subscription. Without a subscription, access to
            premium features is not available.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">4. Wellness Disclaimer</h2>
          <p>
            Mogifi AI is a <span className="font-semibold text-white">wellness and educational</span>{" "}
            application. It is <span className="font-semibold text-white">not</span> a medical device and
            does not provide medical diagnosis, treatment, or clinical care. Always consult a qualified
            healthcare professional before making changes to your diet, exercise routine, or health regimen.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">5. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Use the App only for lawful purposes and in accordance with these Terms.</li>
            <li>Not attempt to reverse-engineer, copy, or redistribute any part of the App.</li>
            <li>Not use the App to harm yourself or others.</li>
            <li>Provide accurate information when setting up your fitness profile.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">6. Intellectual Property</h2>
          <p>
            All content, trademarks, and intellectual property within the App are owned by or licensed to
            Mogifi AI. You are granted a limited, non-exclusive, non-transferable license to use the App for
            personal, non-commercial purposes.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">7. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Mogifi AI is not liable for any indirect, incidental,
            special, or consequential damages arising from your use of the App, including but not limited to
            injury from following workout or nutrition advice.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">8. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Updates are effective when posted with a revised
            &quot;Last Updated&quot; date. Continued use of the App after changes constitutes acceptance of
            the updated Terms.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">9. Governing Law</h2>
          <p>
            These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the
            exclusive jurisdiction of the courts of England and Wales.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">10. Contact</h2>
          <p>
            For questions about these Terms, contact:{" "}
            <a className="text-blue-300 underline underline-offset-2" href="mailto:support@mogifi.ai">
              support@mogifi.ai
            </a>
          </p>
          <p className="mt-4">
            For our Privacy Policy, see:{" "}
            <a className="text-blue-300 underline underline-offset-2" href="/privacy">
              Privacy Policy
            </a>
          </p>
          <p>
            Apple&apos;s standard EULA:{" "}
            <a
              className="text-blue-300 underline underline-offset-2"
              href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Apple EULA
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
