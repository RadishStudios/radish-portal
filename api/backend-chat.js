// Vercel serverless function for Backend assistant chat
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, currentHTML } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'No message provided' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `You are helping edit the Radish investor portal HTML file. The user wants to: "${message}"

Current HTML file is provided below. Make the requested changes and return:
1. A brief explanation of what you changed
2. The complete updated HTML code in a code block

Be precise and make only the requested changes. Preserve all existing functionality.

Current HTML:
${currentHTML.substring(0, 50000)}...`
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Anthropic API error:', data.error);
      return res.status(500).json({ error: 'Processing failed', details: data.error });
    }

    const aiText = data.content.find(block => block.type === 'text')?.text || '';

    return res.status(200).json({
      response: aiText
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Processing failed', 
      details: error.message 
    });
  }
}
