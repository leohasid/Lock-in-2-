/**
 * Get the Railway backend API URL
 * Falls back to local API routes if Railway URL is not set
 */
export function getApiUrl(): string {
  // In browser, use NEXT_PUBLIC_ env variable
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_RAILWAY_API_URL || '';
  }
  // On server, use regular env variable
  return process.env.RAILWAY_API_URL || '';
}

/**
 * Call the Railway backend AI endpoint
 */
export async function callRailwayAI(prompt: string): Promise<string> {
  const railwayUrl = getApiUrl();
  
  if (!railwayUrl) {
    // Fallback to local API route if Railway URL not set
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to get AI response');
    }
    
    const data = await response.json();
    return data.response || data.message || 'No response generated';
  }
  
  // Use Railway backend
  const response = await fetch(`${railwayUrl}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get AI response from Railway');
  }
  
  const data = await response.json();
  return data.response || 'No response generated';
}
