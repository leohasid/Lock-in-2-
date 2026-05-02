import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Mogifi AI",
  description: "Privacy Policy for Mogifi AI",
};

export default function PrivacyPolicyPage() {
  const updatedAt = "February 7, 2026";

  return (
    <main className="min-h-screen bg-black text-white px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-300">Last Updated: {updatedAt}</p>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">Wellness &amp; not medical advice</h2>
          <p>
            Mogifi AI is a <span className="font-semibold text-white">wellness and educational</span> application. It is{" "}
            <span className="font-semibold text-white">not</span> a medical device and does not provide medical diagnosis,
            treatment, or clinical care. Always consult a qualified healthcare professional before making medical
            decisions. General health information in the app is supported by third-party citations on our{" "}
            <a className="text-blue-300 underline underline-offset-2" href="/sources">
              Health &amp; nutrition sources
            </a>{" "}
            page.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">Introduction</h2>
          <p>
            Mogifi AI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) provides tools for fitness, nutrition, calendar reminders,
            habits, and self-improvement workflows. This Privacy Policy explains how information is handled when
            you use our app.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">Data Collection</h2>
          <p>
            We do not require account creation and do not collect personal data on our own servers for core app
            usage. Your workout logs, nutrition entries, reminders, and related progress data are primarily stored
            locally on your device. Cross-device cloud backup of your logs is not a core feature of this version.
          </p>
          <p>
            If you choose to use AI-powered features (for example, plan generation, meal photo analysis, gym coach chat,
            or reflection feedback), the prompts, optional images, and related context you submit may be sent to{" "}
            <span className="font-semibold text-white">OpenAI</span> through our servers to generate a response. The
            in-app <span className="font-semibold text-white">AI Data Use</span> page and first-time consent modal describe
            categories of data shared. You must opt in before the first AI request.
          </p>
          <p>
            We do not intentionally collect sensitive personal identifiers such as government ID numbers.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">How Data Is Used</h2>
          <p>Information is used only to provide requested app functionality, such as:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Displaying and updating your local progress data.</li>
            <li>Generating AI responses for features you actively use.</li>
            <li>Improving app stability, security, and user experience.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">Third-Party Services</h2>
          <p>
            We may use third-party service providers to operate specific features:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold text-white">OpenAI:</span> Used to process prompts for AI-generated
              consultation and planning responses.
            </li>
            <li>
              <span className="font-semibold text-white">RevenueCat and Apple In-App Purchases:</span> Used to
              manage subscriptions and entitlements for paid features.
            </li>
          </ul>
          <p>
            These providers process only the data necessary to deliver their services and are subject to their own
            privacy policies.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">Data Security</h2>
          <p>
            We apply reasonable technical and organizational safeguards to protect information handled by the app.
            However, no method of transmission or storage is completely secure, and we cannot guarantee absolute
            security.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">User Rights</h2>
          <p>
            Because core app data is stored locally, you can typically access, update, or delete it directly from
            your device or by uninstalling the app. Depending on your region, you may also have legal rights
            regarding your personal information (such as access, correction, deletion, or restriction of processing).
          </p>
          <p>
            If you would like help with a privacy request, contact us using the details below.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect product or legal changes. Updates are
            effective when posted on this page with a revised &quot;Last Updated&quot; date.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-6 text-gray-200 sm:text-base sm:leading-7">
          <h2 className="text-xl font-semibold text-white">Contact Information</h2>
          <p>
            For questions about this Privacy Policy or privacy-related requests, contact:
            {" "}
            <a className="text-blue-300 underline underline-offset-2" href="mailto:privacy@mogifi.ai">
              privacy@mogifi.ai
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
