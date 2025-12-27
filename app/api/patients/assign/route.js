import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPatientsCollection, getUsersCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

// PUT - Assign a patient to a doctor
export async function PUT(request) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { patientId } = await request.json();

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const patientsCollection = await getPatientsCollection();
    const usersCollection = await getUsersCollection();

    // Find the patient
    const patient = await patientsCollection.findOne({
      _id: new ObjectId(patientId),
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get doctor information
    const doctor = await usersCollection.findOne(
      { _id: new ObjectId(currentUser.id) },
      { projection: { password: 0 } }
    );

    // Update patient with doctor assignment
    await patientsCollection.updateOne(
      { _id: new ObjectId(patientId) },
      {
        $set: {
          doctorId: currentUser.id,
          currentDoctor: doctor ? doctor.name : '',
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Patient assigned successfully',
    });
  } catch (error) {
    console.error('Assign patient error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

