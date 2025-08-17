import { NextRequest, NextResponse } from 'next/server';

// This function will call the Gender-API for a single name
async function getGender(name: string, apiKey: string) {
  // We only use the first name for better accuracy
  const firstName = name.split(' ')[0];
  try {
    const response = await fetch(`https://gender-api.com/get?name=${firstName}&key=${apiKey}`);
    const data = await response.json();
    // The API returns 'male', 'female', or 'unknown'
    return data.gender || 'unknown'; 
  } catch (error) {
    console.error("Gender API call failed:", error);
    return 'unknown'; // Return a default value on failure
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const genderApiKey = process.env.GENDER_API_KEY!;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // ... (code for base64 conversion is the same)
  const buffer = await file.arrayBuffer();
  const base64Image = Buffer.from(buffer).toString('base64');
  const mimeType = file.type;

  try {
    const ocrResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
                text: 'You are an expert OCR system. Analyze the entire image and find ALL names and phone numbers. You MUST return ONLY a single, clean JSON array. Each object in the array must have two keys: "name" and "phone". Example: [{"name": "John Doe", "phone": "111-222-3333"}]',
              },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            ],
          },
        ],
      }),
    });

    if (!ocrResponse.ok) throw new Error(`OCR API call failed`);

    const ocrData = await ocrResponse.json();
    const content = ocrData.choices[0].message.content;
    const jsonString = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
    const contacts: { name: string; phone: string }[] = JSON.parse(jsonString);

    // NEW: Get gender for each contact
    const contactsWithGender = await Promise.all(
      contacts.map(async (contact) => {
        const gender = await getGender(contact.name, genderApiKey);
        return { ...contact, gender };
      })
    );

    return NextResponse.json(contactsWithGender);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to process the image.' }, { status: 500 });
  }
}