import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { normalizeDateString } from '@/lib/dateUtils';

// This interface is correct.
interface Context {
  params: {
    id: string;
  };
}

function isValidObjectId(id: string) {
    return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}

// FIX: The function's second argument is typed as 'context: Context'.
export async function PUT(request: NextRequest, context: Context) {
  const { id } = context.params; // Get id from context.params

  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: 'Invalid Contact ID format' }, { status: 400 });
  }

  try {
    const { name, phone, gender, birthday, anniversary } = await request.json();
    if (!name || !phone || !gender) {
        return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection('contacts').updateOne(
      { _id: new ObjectId(id) },
      { $set: { 
          name, 
          phone, 
          gender, 
          birthday: normalizeDateString(birthday),
          anniversary: normalizeDateString(anniversary) 
        } 
      }
    );

    if (result.matchedCount === 0) {
        return NextResponse.json({ message: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Contact updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to update contact:', error);
    return NextResponse.json({ message: 'Failed to update contact.' }, { status: 500 });
  }
}

// FIX: The function's second argument is also typed as 'context: Context'.
export async function DELETE(request: NextRequest, context: Context) {
    const { id } = context.params; // Get id from context.params

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
      console.error('Failed to delete contact:', error);
      return NextResponse.json({ message: 'Failed to delete contact.' }, { status: 500 });
    }
}