const AI_CONSENT_KEY = "ai_data_sharing_consent_v1";

interface AIConsentRecord {
  acceptedAt: string;
  version: number;
}

export function hasAIConsent(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem(AI_CONSENT_KEY);
}

export function grantAIConsent(): void {
  if (typeof window === "undefined") return;
  const payload: AIConsentRecord = {
    acceptedAt: new Date().toISOString(),
    version: 1,
  };
  window.localStorage.setItem(AI_CONSENT_KEY, JSON.stringify(payload));
}

export function revokeAIConsent(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AI_CONSENT_KEY);
}

export function getAIConsentAcceptedAt(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AI_CONSENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AIConsentRecord;
    return parsed.acceptedAt || null;
  } catch {
    return null;
  }
}

export const hasAIDataConsent = hasAIConsent;
export const setAIDataConsent = (accepted: boolean) => {
  if (accepted) grantAIConsent();
  else revokeAIConsent();
};
