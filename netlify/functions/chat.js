// netlify/functions/chat.js
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { message, subjects, target } = JSON.parse(event.body);
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    console.log('API Key exists:', !!GEMINI_API_KEY);
    
    if (!GEMINI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Gemini API key not configured' })
      };
    }

    const subjectContext = subjects.map(s => {
      const percent = s.total > 0 ? ((s.attended / s.total) * 100).toFixed(1) : 0;
      return `${s.name}: ${s.attended}/${s.total} (${percent}%)`;
    }).join('\n');

    const prompt = `You are Bunk Buddy, a friendly student assistant.
Current attendance target: ${target}%.

Subjects:
${subjectContext}

User: ${message}

Respond conversationally and helpfully:`;

    console.log('Sending prompt to Gemini:', prompt.substring(0, 100) + '...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    console.log('Gemini response status:', response.status);
    
    const data = await response.json();
    console.log('Gemini full response:', JSON.stringify(data, null, 2));

    // Check if there's an error in the response
    if (data.error) {
      console.error('Gemini API error:', data.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Gemini API error',
          details: data.error.message 
        })
      };
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                  "Sorry, I couldn't generate a response.";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get response',
        details: error.message 
      })
    };
  }
};