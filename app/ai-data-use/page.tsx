import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Data Use | Mogifi AI",
  description: "How Mogifi AI uses third-party AI and user data.",
};

export default function AIDataUsePage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">AI Data Use</h1>
        <p className="mt-3 text-sm text-gray-400">
          This page answers App Review questions about third-party AI: what is sent, to whom, where consent appears,
          and how data is stored.
        </p>

        <section className="mt-6 space-y-3 text-sm text-gray-200 sm:text-base">
          <h2 className="text-xl font-semibold text-white">Third-Party AI Provider</h2>
          <p>Yes. Mogifi AI uses OpenAI (via our backend) to generate AI-powered responses in supported features.</p>
        </section>

        <section className="mt-6 space-y-3 text-sm text-gray-200 sm:text-base">
          <h2 className="text-xl font-semibold text-white">What Data May Be Sent</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Prompts and text you enter for AI features (reflection, gym coach, home summary, nutrition coach chat, schedule assistant, etc.).</li>
            <li>Optional meal image data you submit for food photo analysis.</li>
            <li>Related feature context needed to generate a response (for example, macro totals and goals, workout logs summaries you trigger, or schedule context).</li>
          </ul>
        </section>

        <section className="mt-6 space-y-3 text-sm text-gray-200 sm:text-base">
          <h2 className="text-xl font-semibold text-white">Where you can review this in the app UI</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold text-white">First-time consent:</span> a full-screen modal appears before
              your first AI request, with links to this page and the Privacy Policy.
            </li>
            <li>
              <span className="font-semibold text-white">Settings:</span> open{" "}
              <span className="text-white">Settings</span> (bell / notification settings from the app navigation) for{" "}
              <span className="text-white">Legal &amp; AI</span> links and to revoke AI consent.
            </li>
            <li>
              <span className="font-semibold text-white">This page:</span> direct URL{" "}
              <code className="text-xs text-gray-400">/ai-data-use</code> (bookmarkable).
            </li>
          </ul>
        </section>

        <section className="mt-6 space-y-3 text-sm text-gray-200 sm:text-base">
          <h2 className="text-xl font-semibold text-white">Consent</h2>
          <p>
            Before your first AI request, the app asks for explicit consent describing what data is shared and with
            which provider. You can revoke this consent in Settings (Legal &amp; AI → Revoke AI consent).
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm text-gray-200 sm:text-base">
          <h2 className="text-xl font-semibold text-white">Storage and Sync</h2>
          <p>
            Core tracking data in this version is stored locally on your device. AI outputs are shown in-app and may
            be saved locally when you save a plan or message. There is no account-based cloud sync for bringing all
            logs across devices in this version unless you separately use features that store data elsewhere.
          </p>
        </section>

        <p className="mt-8 text-sm text-gray-300">
          Read more in our{" "}
          <Link href="/privacy" className="text-blue-300 underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
