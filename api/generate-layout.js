// Vercel serverless function for DUMP image layout generation
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { images, imageCount } = req.body;

  if (!imageCount || imageCount < 1) {
    return res.status(400).json({ error: 'No images provided' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Build message content with images
    const messageContent = [
      {
        type: 'text',
        text: `You are a layout designer creating Bêhance-style editorial grid layouts. I have ${imageCount} images.

Create an asymmetric grid layout inspired by the reference (minimal, editorial, spare). Also analyze the images and suggest SEO-friendly filenames.

Return ONLY raw JSON (no markdown, no backticks):

{"grid_template":"CSS grid-template-areas string","cells":[{"area":"a","span_rows":2,"span_cols":1,"image_index":0},...],"analysis":"brief description of what you see in the images","seo_filenames":["radish-fragrance-bottle-close-up.jpg","maddie-secret-film-still-scene-3.jpg",...]}

Rules:
- Use 3-column grid
- Vary cell sizes (some 1x1, some 2x1, some 1x2, some 2x2)
- Create visual rhythm with asymmetry
- Leave some empty cells for breathing room
- Distribute all ${imageCount} images across the grid
- For seo_filenames: lowercase, hyphens (not underscores), descriptive, include relevant keywords (radish, maddie-secret, fragrance, film, etc.), keep under 60 chars

Return ONLY the JSON object.`
      }
    ];

    // Add image content if provided
    if (images && images.length > 0) {
      images.slice(0, 5).forEach(img => {
        messageContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: img.data
          }
        });
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: messageContent
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

    return res.status(200).json(parsed);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Processing failed', 
      details: error.message 
    });
  }
}
