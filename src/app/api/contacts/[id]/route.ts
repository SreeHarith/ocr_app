import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Helper to check for valid ObjectId
function isValidObjectId(id: string) {
    return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}

// UPDATE a contact
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: 'Invalid Contact ID format' }, { status: 400 });
  }

  try {
    const { name, phone, gender } = await request.json();
    if (!name || !phone || !gender) {
        return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection('contacts').updateOne(
      { _id: new ObjectId(id) },
      { $set: { name, phone, gender } }
    );

    if (result.matchedCount === 0) {
        return NextResponse.json({ message: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Contact updated successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to update contact' }, { status: 500 });
  }
}

// DELETE a contact
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const id = params.id;
    if (!isValidObjectId(id)) {
        return NextResponse.json({ message: 'Invalid Contact ID format' }, { status: 400 });
    }
    
    try {
      const client = await clientPromise;
      const db = client.db();
      const result = await db.collection('contacts').deleteOne({ _id: new ObjectId(id) });
  
      if (result.deletedCount === 0) {
        return NextResponse.json({ message: 'Contact not found' }, { status: 404 });
      }
  
      return NextResponse.json({ message: 'Contact deleted successfully' }, { status: 200 });
    } catch (error) {
      return NextResponse.json({ message: 'Failed to delete contact' }, { status: 500 });
    }
}