import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPatientsCollection, getUsersCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'patient') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const patientsCollection = await getPatientsCollection();
    const usersCollection = await getUsersCollection();
    
    const patient = await patientsCollection.findOne({
      userId: currentUser.id,
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient record not found' },
        { status: 404 }
      );
    }

    // Fetch doctor information
    let doctor = null;
    if (patient.doctorId) {
      doctor = await usersCollection.findOne(
        { _id: new ObjectId(patient.doctorId) },
        { projection: { password: 0 } }
      );
      
      if (doctor) {
        doctor = {
          id: doctor._id.toString(),
          name: doctor.name,
          email: doctor.email,
          profilePic: doctor.profilePic || '',
        };
      }
    }

    return NextResponse.json({ patient, doctor });
  } catch (error) {
    console.error('Get patient error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

