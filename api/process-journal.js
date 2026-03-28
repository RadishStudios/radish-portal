export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rawText } = req.body;

  if (!rawText) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: `You are processing a daily journal entry for Deb at Radish World LLC. Your job: clean up the text, extract structured data, preserve voice.

Raw entry:
${rawText}

Return ONLY valid JSON (no markdown, no explanation) with this structure:

{
  "cleanedText": "Cleaned version - fix typos, make it readable, but keep Deb's voice and style. Don't over-edit.",
  "ideas": ["idea 1", "idea 2"],
  "tasks": ["task 1", "task 2"],
  "people": ["person 1 (context)", "person 2 (context)"],
  "problems": ["problem 1", "problem 2"],
  "priorities": ["priority 1", "priority 2"],
  "mood": "one word: energized/frustrated/focused/overwhelmed/excited/etc",
  "keyInsight": "One sentence - the most important thing from this entry"
}

Rules:
- cleanedText: Fix spelling/grammar, make readable, but DON'T sanitize Deb's voice - keep profanity, slang, stream-of-consciousness if present
- ideas: Business ideas, creative concepts, strategic thoughts
- tasks: Action items, to-dos, things to follow up on
- people: Names mentioned + brief context (e.g., "Mike Black (CPA, tax prep)")
- problems: Blockers, issues, things that need solving
- priorities: What's urgent or important, shifting focus
- mood: Detect emotional tone from the writing
- keyInsight: Distill the whole entry into one actionable or reflective sentence

Extract conservatively - only pull out things that are clearly ideas/tasks/etc. Don't force categorization.`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return res.status(response.status).json({ 
        error: 'API request failed',
        details: errorText
      });
    }

    const data = await response.json();
    const textContent = data.content.find(block => block.type === 'text')?.text || '';

    let parsed;
    try {
      const cleanJson = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback - return raw
      return res.status(200).json({
        cleanedText: rawText,
        ideas: [],
        tasks: [],
        people: [],
        problems: [],
        priorities: [],
        mood: 'neutral',
        keyInsight: ''
      });
    }

    return res.status(200).json(parsed);

  } catch (error) {
    console.error('Journal processing error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}

