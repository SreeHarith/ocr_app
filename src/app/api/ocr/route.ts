import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const base64Image = Buffer.from(buffer).toString('base64');
  const mimeType = file.type;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-vl-72b-instruct:free', 
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                // ==================  UPDATED PROMPT FOR MULTIPLE CONTACTS  ==================
                text: 'You are an expert OCR system for business cards. Analyze the entire image and find ALL names and phone numbers. You MUST return ONLY a single, clean JSON array. Each object in the array must have two keys: "name" and "phone". Example: [{"name": "John Doe", "phone": "111-222-3333"}, {"name": "Jane Smith", "phone": "444-555-6666"}]',
                // ============================================================================
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.2, 
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenRouter API Error:', errorBody);
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : content.trim();
    const parsedContent = JSON.parse(jsonString);

    return NextResponse.json(parsedContent);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to process the image. See server logs for details.' },
      { status: 500 }
    );
  }
}