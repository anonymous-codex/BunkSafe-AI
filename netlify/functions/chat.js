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
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    const { message, subjects, target } = JSON.parse(event.body);
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Gemini API key not configured' })
      };
    }

    // Build subject context
    const subjectContext = subjects.map(s => {
      const percent = s.total > 0 ? ((s.attended / s.total) * 100).toFixed(1) : 0;
      return `${s.name}: ${s.attended}/${s.total} (${percent}%)`;
    }).join('\n');

    // Create a clear prompt
    const prompt = `You are Bunk Buddy, a friendly student assistant for attendance tracking.

Current attendance target: ${target}%.

Current attendance data:
${subjectContext}

User question: ${message}

Instructions:
- If this is a greeting (hi, hello, hey), respond warmly
- If they ask about attendance, calculate and give clear advice
- If they ask casual questions, respond naturally
- Keep responses friendly and concise

Response:`;

    console.log('Sending to Gemini with model: gemini-2.0-flash');

    // Use gemini-2.0-flash which is definitely available
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', response.status, errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Gemini API error',
          details: `Status ${response.status}: ${errorText}`
        })
      };
    }

    const data = await response.json();
    console.log('Gemini response received');

    // Extract the reply
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                  "I'm not sure how to respond to that.";

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