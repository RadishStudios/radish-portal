export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { images, imageCount } = req.body;

  if (!images || images.length === 0) {
    return res.status(400).json({ error: 'Images are required' });
  }

  try {
    // Prepare image content for Claude
    const imageContent = images.map(img => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: img.data
      }
    }));

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
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              ...imageContent,
              {
                type: 'text',
                text: `Analyze these ${imageCount} images and create an editorial grid layout.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:

{
  "analysis": "Brief 1-2 sentence description of the images and layout rationale",
  "cells": [
    { "image_index": 0, "span_rows": 1, "span_cols": 1 },
    { "image_index": 1, "span_rows": 2, "span_cols": 1 },
    ...
  ],
  "seo_filenames": [
    "descriptive-seo-friendly-name-1.jpg",
    "descriptive-seo-friendly-name-2.jpg",
    ...
  ]
}

Rules:
- Create exactly ${imageCount} cells (one per image)
- Use a 3-column grid
- Vary span_rows (1-3) and span_cols (1-2) for visual interest
- Feature hero images with larger spans (2x2 or 1x3)
- Balance the layout - don't cluster all large spans together
- SEO filenames: lowercase, hyphens, descriptive, no spaces
- Make filenames specific to what you see in each image`
              }
            ]
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

    // Parse the JSON response
    let layoutData;
    try {
      // Remove any markdown code fences if present
      const cleanJson = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      layoutData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback to simple grid
      layoutData = {
        analysis: 'Generated simple grid layout',
        cells: Array.from({ length: imageCount }, (_, i) => ({
          image_index: i,
          span_rows: 1,
          span_cols: 1
        })),
        seo_filenames: Array.from({ length: imageCount }, (_, i) => `image-${i + 1}.jpg`)
      };
    }

    return res.status(200).json(layoutData);

  } catch (error) {
    console.error('Layout generation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
