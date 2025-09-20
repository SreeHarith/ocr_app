import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Contact } from '@/components/columns';
import { normalizeDateString } from '@/lib/dateUtils';

async function getGender(name: string, apiKey: string) {
  const firstName = name.split(' ')[0];
  try {
    const response = await fetch(`https://gender-api.com/get?name=${firstName}&key=${apiKey}`);
    const data = await response.json();
    return data.gender || 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

export async function POST(request: NextRequest) {
  const genderApiKey = process.env.GENDER_API_KEY!;
  try {
    const contacts: Contact[] = await request.json();
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ message: 'No contacts provided.' }, { status: 400 });
    }

    const normalizedContacts = contacts.map(c => ({
      ...c,
      phone: parsePhoneNumberFromString(c.phone, 'IN')?.format('E.164') || c.phone,
    }));

    const phoneNumbers = normalizedContacts.map(c => c.phone).filter(Boolean);
    const client = await clientPromise;
    const db = client.db();
    const existingContacts = await db.collection('contacts').find({ phone: { $in: phoneNumbers } }).toArray();
    const existingPhones = new Map(existingContacts.map(c => [c.phone, c]));

    const validatedContacts: Contact[] = [];
    const seenPhonesInCSV = new Set<string>();

    for (const contact of normalizedContacts) {
      if (!contact.name) {
        validatedContacts.push({ ...contact, status: 'invalid', message: 'Name is missing.' });
        continue;
      }
      if (!contact.phone) {
        validatedContacts.push({ ...contact, status: 'invalid', message: 'Phone is missing.' });
        continue;
      }

      const phoneNumber = parsePhoneNumberFromString(contact.phone, 'IN');
      if (!phoneNumber || !phoneNumber.isValid()) {
        validatedContacts.push({ ...contact, status: 'invalid', message: 'Invalid phone number format.' });
        continue;
      }
      
      if (existingPhones.has(contact.phone)) {
        const existingContact = existingPhones.get(contact.phone);
        validatedContacts.push({ ...contact, status: 'duplicate', message: `Exists in DB as '${existingContact?.name}'.` });
        continue;
      }
      
      if (seenPhonesInCSV.has(contact.phone)) {
        validatedContacts.push({ ...contact, status: 'duplicate', message: 'Duplicate within this file.' });
        continue;
      }
      
      seenPhonesInCSV.add(contact.phone);
      
      if (!contact.gender || contact.gender === 'unknown') {
        contact.gender = await getGender(contact.name, genderApiKey);
      }
      
      validatedContacts.push({ 
        ...contact, 
        status: 'new', 
        message: 'Ready to import.',
        birthday: normalizeDateString(contact.birthday),
        anniversary: normalizeDateString(contact.anniversary)
      });
    }

    return NextResponse.json(validatedContacts, { status: 200 });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json({ message: 'Failed to validate contacts.' }, { status: 500 });
  }
}

