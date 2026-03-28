// Vercel serverless function to process journal entries with Anthropic API
// This keeps your API key secure on the server side

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the raw text from the request
  const { rawText } = req.body;

  if (!rawText || rawText.trim() === '') {
    return res.status(400).json({ error: 'No text provided' });
  }

  // Get API key from environment variable
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Call Anthropic API
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

Your job:
1. Fix ALL spelling and grammar errors
2. Keep her conversational, stream-of-consciousness voice - don't make it corporate or formal
3. Keep ALL facts, names, numbers, and details exactly as stated
4. Organize everything into categories

CATEGORIZATION RULES:
- **Ideas**: New concepts, creative thoughts, strategies, "what if we...", "maybe we could...", possibilities, approaches, vision stuff
- **Tasks**: Action items, things that need to be done, "need to...", "should...", "have to...", specific work items
- **People**: Anyone mentioned - who she met, talked to, emailed, is working with. Include context about what happened with them.
- **Problems**: Blockers, challenges, concerns, things going wrong, "issue with...", "problem is...", delays, conflicts
- **Priorities**: What's becoming more/less important, urgency shifts, "this is critical", "needs to happen first", reordering of importance

EXAMPLES:

Input: "talked to magnolia today shit went well they want fragrance in press kit. marissa samples came they smell good need to test with team. ruby thinks we should do gifting earlier maybe april instead of may could work. problem fulfillment guy still hasnt sent pricing"

Output:
{
  "cleaned_text": "Talked to Magnolia today - went really well. They want the fragrance in the press kit. Marissa's samples came in and they smell good, need to test with the team. Ruby thinks we should do gifting earlier, maybe April instead of May, could work. Problem: fulfillment guy still hasn't sent pricing.",
  "ideas": ["Move gifting to April instead of May"],
  "tasks": ["Test fragrance samples with team", "Get pricing from fulfillment partner"],
  "people": ["Magnolia - wants fragrance in press kit", "Marissa - sent fragrance samples", "Ruby - suggested moving gifting timeline up"],
  "problems": ["Fulfillment partner hasn't sent pricing yet"],
  "priorities": ["Gifting timeline might need to move earlier"]
}

Now process this entry:
${rawText}`
        }]
      })
    });

    const data = await response.json();

    // Check for API errors
    if (data.error) {
      console.error('Anthropic API error:', data.error);
      return res.status(500).json({ error: 'Processing failed', details: data.error });
    }

    // Extract the text response
    const aiText = data.content.find(block => block.type === 'text')?.text || '';
    
    // Parse the JSON response
    const parsed = JSON.parse(aiText);

    // Return the processed data
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
