export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, currentHTML } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `You are a senior full-stack developer helping Deb build features for the Radish investor portal. You have complete context of the codebase.

Portal tech stack:
- Single HTML file (~8,300 lines)
- Vanilla JavaScript (no frameworks)
- localStorage for data persistence
- Vercel serverless functions for API endpoints
- Claude Sonnet 4 for AI features (journal processing, image analysis)

Current features:
- Lock screen with password protection
- Calendar with backward-planned timeline
- To-do system with 7 categories
- Journal with AI processing (extracts ideas/tasks/people/problems/priorities, detects mood, generates key insights)
- Image dump (reads EXIF dates, organizes by day, creates editorial layouts)
- Backend chat (this!)
- Comprehensive keyboard shortcuts (Cmd+J for journal, Cmd+B for backend, ? for help)

Portal architecture:
- Everything in /home/claude/index.html
- API endpoints: /api/backend-chat.js, /api/process-journal.js, /api/generate-layout.js
- Data stored in localStorage: journalEntries, todos, etc.

Current HTML structure (first 50k chars):
${currentHTML}

User request: ${message}

Provide clear, actionable help. When giving code:
- Use the portal's existing style (Helvetica Neue, pink accent #FF10F0, minimal design)
- Follow existing patterns (inline styles, no frameworks)
- Be specific about where to add code (line numbers if possible)
- Explain what the code does and why

You're as smart as the Claude instance in the main chat — use that power. Help Deb ship features fast.`
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
    const textContent = data.content.find(block => block.type === 'text')?.text || 'No response generated';

    return res.status(200).json({
      response: textContent,
      content: data.content
    });

  } catch (error) {
    console.error('Backend chat error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
