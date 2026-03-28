// Vercel serverless function to process journal entries with Anthropic API
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rawText } = req.body;

  if (!rawText || rawText.trim() === '') {
    return res.status(400).json({ error: 'No text provided' });
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
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are helping Deb journal about her work at Radish World LLC, a film production company launching a fragrance tied to a film called Maddie's Secret.

CRITICAL: Return ONLY raw JSON. NO markdown. NO backticks. NO \`\`\`json. Just the JSON object itself starting with { and ending with }.

Your job:
1. Fix ALL spelling and grammar errors
2. Keep her conversational, stream-of-consciousness voice - don't make it corporate or formal
3. Keep ALL facts, names, numbers, and details exactly as stated
4. Organize everything into categories

CATEGORIZATION RULES:
- Ideas: New concepts, creative thoughts, strategies, "what if we...", "maybe we could...", possibilities
- Tasks: Action items, things that need to be done, "need to...", "should...", "have to..."
- People: Anyone mentioned - who she met, talked to, emailed. Include context.
- Problems: Blockers, challenges, concerns, things going wrong, delays, conflicts
- Priorities: What's becoming more/less important, urgency shifts, reordering of importance

EXAMPLE INPUT: "talked to magnolia today they want fragrance in press kit. marissa samples came need to test. problem fulfillment guy hasnt sent pricing"

EXAMPLE OUTPUT (return EXACTLY this format, NO backticks, NO markdown):
{"cleaned_text":"Talked to Magnolia today - they want the fragrance in the press kit. Marissa's samples came in, need to test them. Problem: fulfillment guy hasn't sent pricing yet.","ideas":[],"tasks":["Test fragrance samples"],"people":["Magnolia - wants fragrance in press kit","Marissa - sent samples"],"problems":["Fulfillment partner hasn't sent pricing yet"],"priorities":[]}

Now process this entry and return ONLY the JSON object:
${rawText}`
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Anthropic API error:', data.error);
      return res.status(500).json({ error: 'Processing failed', details: data.error });
    }

    const aiText = data.content.find(block => block.type === 'text')?.text || '';
    
    // Strip markdown if present
    let cleanedText = aiText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    const parsed = JSON.parse(cleanedText);

    return res.status(200).json({
      cleanedText: parsed.cleaned_text,
      ideas: parsed.ideas || [],
      tasks: parsed.tasks || [],
      people: parsed.people || [],
      problems: parsed.problems || [],
      priorities: parsed.priorities || []
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Processing failed', 
      details: error.message 
    });
  }
}

