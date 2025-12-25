import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPatientsCollection, getUsersCollection, getDiagnosticsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

// GET - Get patient details
export async function GET(request, { params }) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const patientsCollection = await getPatientsCollection();
    
    const patient = await patientsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Check authorization
    if (currentUser.role === 'patient' && patient.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (currentUser.role === 'doctor' && patient.doctorId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({ patient });
  } catch (error) {
    console.error('Get patient error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a patient
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const patientsCollection = await getPatientsCollection();
    const usersCollection = await getUsersCollection();
    const diagnosticsCollection = await getDiagnosticsCollection();
    
    // Find the patient and verify ownership
    const patient = await patientsCollection.findOne({
      _id: new ObjectId(id),
      doctorId: currentUser.id,
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete all diagnostic records for this patient
    await diagnosticsCollection.deleteMany({
      patientId: id,
    });

    // Delete the patient record
    await patientsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    // Delete the associated user account
    if (patient.userId) {
      await usersCollection.deleteOne({
        _id: new ObjectId(patient.userId),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Patient deleted successfully',
    });
  } catch (error) {
    console.error('Delete patient error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

