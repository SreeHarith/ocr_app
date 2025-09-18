import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Contact } from '@/components/columns';

async function getGender(name: string, apiKey: string) {
  const firstName = name.split(' ')[0];
  try {
    const response = await fetch(`https://gender-api.com/get?name=${firstName}&key=${apiKey}`);
    const data = await response.json();
    return data.gender || 'unknown';
  } catch (error) {
    console.error("Gender-API.com call failed:", error);
    return 'unknown';
  }
}

export async function POST(request: NextRequest) {
  const { imageUrl } = await request.json();
  const genderApiKey = process.env.GENDER_API_KEY!;
  
  if (!imageUrl) {
    return NextResponse.json({ error: 'No image URL provided' }, { status: 400 });
  }

  try {
    // Step 1: Perform OCR to get initial contacts
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
                text: 'You are an expert OCR system. Analyze the image and find ALL names and phone numbers. Return ONLY a single, clean JSON array. Each object must have "name" and "phone". Example: [{"name": "John Doe", "phone": "111-222-3300"}]',
              },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    const ocrData = await ocrResponse.json();

    if (!ocrResponse.ok || !ocrData.choices || ocrData.choices.length === 0) {
      console.error("OCR API Error Response:", ocrData); 
      throw new Error(ocrData?.error?.message || 'The OCR API call failed with an empty or invalid response.');
    }

    const content = ocrData.choices[0].message.content;
    const jsonString = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
    const initialContacts: { name: string; phone: string }[] = JSON.parse(jsonString);

    const contactsWithGender = await Promise.all(
      initialContacts.map(async (contact) => {
        const gender = await getGender(contact.name, genderApiKey);
        return { ...contact, gender };
      })
    );
    
    const normalizedContacts = contactsWithGender.map(c => ({
        ...c,
        phone: parsePhoneNumberFromString(c.phone, 'IN')?.format('E.164') || c.phone,
    }));

    const phoneNumbers = normalizedContacts.map(c => c.phone);
    const client = await clientPromise;
    const db = client.db();
    const existingContacts = await db.collection('contacts').find({ phone: { $in: phoneNumbers } }).toArray();
    const existingPhones = new Map(existingContacts.map(c => [c.phone, c]));

    const validatedContacts = normalizedContacts.map((contact): Contact => {
        if (!contact.name || !contact.phone) {
            return { ...contact, status: 'invalid', message: 'Missing name or phone.' };
        }

        // ================== ADD THIS VALIDATION BLOCK BACK IN ==================
        const phoneNumber = parsePhoneNumberFromString(contact.phone, 'IN');
        if (!phoneNumber || !phoneNumber.isValid()) {
            return { ...contact, status: 'invalid', message: 'Invalid phone number format.' };
        }
        // =======================================================================
        
        if (existingPhones.has(contact.phone)) {
            const existing = existingPhones.get(contact.phone);
            return { ...contact, status: 'duplicate', message: `Exists in DB as '${existing?.name}'.` };
        }
        return { ...contact, status: 'new', message: 'Ready to import.' };
    });

    return NextResponse.json(validatedContacts);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to process the image.' }, { status: 500 });
  }
}