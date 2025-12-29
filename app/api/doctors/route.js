import { NextResponse } from 'next/server';
import { getUsersCollection, getDoctorsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

// GET - Get all doctors (for patient registration)
export async function GET() {
  try {
    const doctorsCollection = await getDoctorsCollection();
    const usersCollection = await getUsersCollection();
    
    const doctorsDocs = await doctorsCollection.find({}).toArray();
    
    // Get user info for doctors
    const doctorUserIds = doctorsDocs
      .map(d => d.userId ? new ObjectId(d.userId) : null)
      .filter(Boolean);
    
    let doctorUserMap = new Map();
    if (doctorUserIds.length > 0) {
      const doctorUsers = await usersCollection
        .find({ _id: { $in: doctorUserIds } }, { projection: { name: 1, email: 1, profilePic: 1 } })
        .toArray();
      doctorUserMap = new Map(doctorUsers.map(u => [u._id.toString(), u]));
    }
    
    const doctors = doctorsDocs.map(d => {
      const userInfo = doctorUserMap.get(d.userId);
      return {
        id: d.doctorId, // Return doctorId instead of _id
        name: userInfo?.name || d.name,
        email: userInfo?.email || d.email,
        profilePic: userInfo?.profilePic || '',
        uhid: d.uhid || '', // Include doctor's UHID
      };
    });

    return NextResponse.json({
      doctors: doctors,
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

