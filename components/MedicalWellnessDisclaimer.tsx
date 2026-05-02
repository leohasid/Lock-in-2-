import Link from "next/link";

/**
 * Apple 1.4.1: visible wellness disclaimer + link to cited sources.
 * Use on screens that show health-style metrics, AI coaching, or food analysis.
 */
export default function MedicalWellnessDisclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-[11px] leading-snug text-amber-100/95 ${className}`}
    >
      <p>
        <span className="font-semibold text-amber-200">Wellness only:</span> Mogifi is for general fitness and
        wellness tracking, not medical diagnosis or treatment. Always talk to a qualified clinician before medical
        decisions. Macro and activity estimates use standard formulas; see{" "}
        <Link href="/sources" className="text-teal-300 underline underline-offset-2">
          Health &amp; nutrition sources
        </Link>
        .
      </p>
    </div>
  );
}
