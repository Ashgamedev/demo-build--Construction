export interface TranslateResult {
  translations?: string[];
  error?: string;
  setupRequired?: boolean;
}

export async function translateTexts(texts: string[], targetLanguage: string = 'ta'): Promise<TranslateResult> {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, targetLanguage })
    });

    const data = await response.json();

    if (response.status === 503) {
      return { setupRequired: true, error: data.error };
    }

    if (!response.ok) {
      return { error: data.error || 'Translation failed' };
    }

    return { translations: data.translations };
  } catch (error: any) {
    console.error('Translation request failed:', error);
    return { error: error.message || 'Network error' };
  }
}
