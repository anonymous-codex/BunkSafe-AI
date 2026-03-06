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

Respond conversationally:`;

    console.log('Calling Gemini with prompt:', prompt.substring(0, 100) + '...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
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
    
    // Get the raw response text first
    const responseText = await response.text();
    console.log('Raw Gemini response:', responseText);

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          reply: `Gemini returned non-JSON: ${responseText.substring(0, 200)}` 
        })
      };
    }

    // Check for error in response
    if (data.error) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          reply: `Gemini error: ${data.error.message || JSON.stringify(data.error)}` 
        })
      };
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                  "No response from Gemini";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        reply: `Error: ${error.message}` 
      })
    };
  }
};