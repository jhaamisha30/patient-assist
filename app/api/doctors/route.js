import { NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/db';

// GET - Get all doctors (for patient registration)
export async function GET() {
  try {
    const usersCollection = await getUsersCollection();
    const doctors = await usersCollection
      .find({ role: 'doctor' }, { projection: { password: 0 } })
      .toArray();

    return NextResponse.json({
      doctors: doctors.map(d => ({
        id: d._id.toString(),
        name: d.name,
        email: d.email,
        profilePic: d.profilePic || '',
      })),
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

