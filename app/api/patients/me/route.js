import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPatientsCollection, getUsersCollection, getDoctorsCollection } from '@/lib/db';
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

    // Fetch doctor information from doctors collection
    let doctor = null;
    if (patient.doctorId) {
      const doctorsCollection = await getDoctorsCollection();
      const doctorDoc = await doctorsCollection.findOne({ doctorId: patient.doctorId });
      
      if (doctorDoc) {
        const doctorUser = await usersCollection.findOne(
          { _id: new ObjectId(doctorDoc.userId) },
          { projection: { password: 0 } }
        );
        
        if (doctorUser) {
          doctor = {
            id: doctorDoc.doctorId,
            name: doctorUser.name,
            email: doctorUser.email,
            profilePic: doctorUser.profilePic || '',
            uhid: doctorDoc.uhid || '', // Include doctor's UHID
          };
        }
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

