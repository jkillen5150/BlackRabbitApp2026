export default async function handler(req, res) {
  // Allow requests from your domain (update with your actual domain later)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your domain for production
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const xaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-4",
        messages: [
          {
            role: "system",
            content: "You are Black Rabbit AI, a helpful assistant for Black Rabbit Landscaping in Yelm, Rainier, and Olympia WA. Be friendly, professional, and knowledgeable about lawn care, gardens, tree services, and local info. Keep responses concise and actionable."
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await xaiResponse.json();

    if (!xaiResponse.ok) {
      console.error("xAI Error:", data);
      throw new Error(data.error?.message || 'API error');
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ 
      error: "Sorry, I'm having trouble right now.",
      choices: [{ message: { content: "Sorry, I'm having trouble right now. Text Jerry at (407) 951-1663!" } }]
    });
  }
}
