import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Health & Nutrition Sources | Mogifi AI",
  description: "Citations for wellness guidance, macro estimates, and activity information used in Mogifi AI.",
};

const SOURCES = [
  {
    title: "Physical activity for adults",
    publisher: "World Health Organization (WHO)",
    href: "https://www.who.int/news-room/fact-sheets/detail/physical-activity",
    note: "General guidance on how much activity supports health.",
  },
  {
    title: "Physical Activity Guidelines for Americans",
    publisher: "U.S. Department of Health and Human Services / CDC",
    href: "https://www.cdc.gov/physical-activity-basics/guidelines/adults.html",
    note: "U.S. public-health guidance on aerobic and muscle-strengthening activity.",
  },
  {
    title: "Dietary Guidelines for Americans",
    publisher: "USDA & HHS",
    href: "https://www.dietaryguidelines.gov/",
    note: "Broad dietary patterns and nutrient-density guidance (not personalized prescriptions).",
  },
  {
    title: "MyPlate — food groups and portions",
    publisher: "USDA",
    href: "https://www.myplate.gov/",
    note: "Public guidance on building balanced meals; Mogifi meal ideas are illustrative, not prescriptions.",
  },
  {
    title: "Healthy eating plate (general patterns)",
    publisher: "Harvard T.H. Chan School of Public Health",
    href: "https://www.hsph.harvard.edu/nutritionsource/healthy-eating-plate/",
    note: "Educational model for balanced meals; not a substitute for individualized medical nutrition therapy.",
  },
] as const;

export default function HealthSourcesPage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <p className="text-xs text-gray-500 mb-2">
          <Link href="/" className="text-teal-400 hover:underline">
            Home
          </Link>
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Health &amp; nutrition sources</h1>
        <p className="mt-3 text-sm text-gray-300 leading-relaxed">
          Mogifi provides <span className="font-semibold text-white">wellness and educational</span> tools (logging,
          trends, and optional AI explanations). We cite authoritative public sources below so you can verify general
          health information. This is not medical advice.
        </p>

        <section className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/95">
          <p className="font-semibold text-amber-200">Medical disclaimer</p>
          <p className="mt-2 leading-relaxed">
            Mogifi AI is <strong>not</strong> a medical device and does not diagnose, treat, or prevent disease. Always
            seek a qualified healthcare professional before changing diet, exercise, or medications.
          </p>
        </section>

        <section className="mt-8 space-y-6">
          <h2 className="text-xl font-semibold text-white">How Mogifi uses this information</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-300 leading-relaxed">
            <li>Calorie and macro targets in onboarding use common predictive equations (similar to Mifflin–St Jeor) plus activity factors described in nutrition science references.</li>
            <li>Workout and habit suggestions align with widely published activity guidelines (frequency, intensity concepts).</li>
            <li>AI-generated text may summarize your logged data; it is still educational and should be checked against these sources and your clinician.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-white">Citations &amp; further reading</h2>
          <ul className="space-y-4">
            {SOURCES.map((s) => (
              <li
                key={s.href}
                className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-gray-200"
              >
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-teal-400 hover:underline"
                >
                  {s.title}
                </a>
                <p className="mt-1 text-xs text-gray-500">{s.publisher}</p>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">{s.note}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-xs text-gray-500">
          Links open in your browser. Publishers may update URLs; if a link breaks, search the publisher site for the
          latest page.
        </p>
      </div>
    </main>
  );
}
