"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { grantAIConsent, hasAIConsent } from "@/lib/ai-consent";

type RequestConsentFn = (then: () => void | Promise<void>) => Promise<boolean>;

const AIConsentContext = createContext<RequestConsentFn | null>(null);

export function useRequestAIConsent(): RequestConsentFn {
  const ctx = useContext(AIConsentContext);
  if (!ctx) {
    throw new Error("useRequestAIConsent must be used within AIConsentProvider");
  }
  return ctx;
}

export function AIConsentProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pendingRef = useRef<(() => void | Promise<void>) | null>(null);
  const promiseResolveRef = useRef<((accepted: boolean) => void) | null>(null);

  const requestConsent = useCallback((then: () => void | Promise<void>) => {
    if (typeof window === "undefined") return Promise.resolve(false);
    if (hasAIConsent()) {
      void Promise.resolve(then());
      return Promise.resolve(true);
    }
    pendingRef.current = then;
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      promiseResolveRef.current = resolve;
    });
  }, []);

  const accept = useCallback(async () => {
    grantAIConsent();
    setOpen(false);
    promiseResolveRef.current?.(true);
    promiseResolveRef.current = null;
    const fn = pendingRef.current;
    pendingRef.current = null;
    if (fn) await Promise.resolve(fn());
  }, []);

  const decline = useCallback(() => {
    pendingRef.current = null;
    setOpen(false);
    promiseResolveRef.current?.(false);
    promiseResolveRef.current = null;
  }, []);

  return (
    <AIConsentContext.Provider value={requestConsent}>
      {children}
      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-consent-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0c1422] p-5 shadow-xl">
            <h2 id="ai-consent-title" className="text-lg font-bold text-white">
              AI data sharing
            </h2>
            <p className="mt-3 text-sm text-gray-300 leading-relaxed">
              To use AI features, Mogifi sends your prompts and related context to third-party AI services through
              our servers. Depending on the feature, data is sent to{" "}
              <span className="font-semibold text-white">Anthropic (Claude)</span> for chat, reflections, and
              coaching, and to <span className="font-semibold text-white">OpenAI</span> for meal photo scanning and
              plan generation. Meal photos you scan are also sent to OpenAI. We do not use this data to train
              third-party models on your behalf beyond each provider&apos;s standard service terms.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              See{" "}
              <Link
                href="/ai-data-use"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 underline"
              >
                AI Data Use
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 underline"
              >
                Privacy Policy
              </Link>{" "}
              (open in a new tab). You can revoke consent later in Settings → Legal &amp; AI.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={decline}
                className="w-full sm:w-auto rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => void accept()}
                className="w-full sm:w-auto rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-teal-400"
              >
                I agree — continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AIConsentContext.Provider>
  );
}
