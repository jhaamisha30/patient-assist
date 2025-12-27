import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPatientsCollection, getUsersCollection, getDiagnosticsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

// DELETE - Delete a patient
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const patientsCollection = await getPatientsCollection();
    const usersCollection = await getUsersCollection();
    const diagnosticsCollection = await getDiagnosticsCollection();

    // Find the patient
    const patient = await patientsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
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

