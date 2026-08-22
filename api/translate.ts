import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { texts, targetLanguage = 'ta' } = req.body;

  if (!texts || !Array.isArray(texts)) {
    return res.status(400).json({ error: 'Invalid texts array' });
  }

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    return res.status(503).json({ error: 'Translation service setup required' });
  }

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texts,
        target: targetLanguage
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Translation API error');
    }

    const translatedTexts = data.data.translations.map((t: any) => t.translatedText);
    
    return res.status(200).json({ translations: translatedTexts });
  } catch (error: any) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: 'Translation failed', details: error.message });
  }
}
