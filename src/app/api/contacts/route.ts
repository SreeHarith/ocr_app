import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Collection } from 'mongodb';
import { Contact } from '@/components/columns';

// ================== ADD THIS LINE ==================
// This forces the route to be dynamic, preventing caching.
export const dynamic = 'force-dynamic';
// ===================================================

export async function POST(request: NextRequest) {
  try {
    const contacts: Contact[] = await request.json();
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ message: 'No contacts provided.' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db();
    const contactsCollection: Collection<Contact> = db.collection('contacts');
    const result = await contactsCollection.insertMany(contacts);
    return NextResponse.json({ 
      message: `${result.insertedCount} contacts saved successfully.`,
      insertedIds: result.insertedIds 
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to save contacts:', error);
    return NextResponse.json({ message: 'Failed to save contacts.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const contacts = await db
      .collection('contacts')
      .find({})
      .sort({ _id: -1 })
      .toArray();
    
    const sanitizedContacts = contacts.map((contact) => ({
      ...contact,
      _id: contact._id.toString(),
    }));

    return NextResponse.json(sanitizedContacts, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    return NextResponse.json({ message: 'Failed to fetch contacts.' }, { status: 500 });
  }
}