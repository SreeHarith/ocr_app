import { NextRequest, NextResponse } from 'next/server';

// Function to call the Gender-API.com API
async function getGender(name: string, apiKey: string) {
  const firstName = name.split(' ')[0];
  try {
    const response = await fetch(`https://gender-api.com/get?name=${firstName}&key=${apiKey}`);
    const data = await response.json();
    if (data.errno) {
      console.error("Gender-API.com Error:", data.errmsg);
      return 'unknown';
    }
    return data.gender || 'unknown';
  } catch (error) {
    console.error("Gender-API.com call failed:", error);
    return 'unknown';
  }
}

export async function POST(request: NextRequest) {
  // This route now expects a JSON body with an `imageUrl`.
  const { imageUrl } = await request.json();
  const genderApiKey = process.env.GENDER_API_KEY!;
  console.log("URL being sent to OCR AI:", imageUrl);
  if (!imageUrl) {
    return NextResponse.json({ error: 'No image URL provided' }, { status: 400 });
  }

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
                text: 'You are an expert OCR system. Analyze the entire image and find ALL names and phone numbers. You MUST return ONLY a single, clean JSON array. Each object must have two keys: "name" and "phone". Example: [{"name": "John Doe", "phone": "111-222-3300"}]',
              },
              // The AI is now given the public URL of the image on Cloudinary.
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    const ocrData = await ocrResponse.json();

    if (!ocrResponse.ok || !ocrData.choices || ocrData.choices.length === 0) {
      console.error("OCR API Error Response:", ocrData);
      throw new Error(`OCR API call failed. Response: ${JSON.stringify(ocrData)}`);
    }

    const content = ocrData.choices[0].message.content;
    const jsonString = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
    const contacts: { name: string; phone: string }[] = JSON.parse(jsonString);

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
