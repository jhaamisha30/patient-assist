import { NextResponse } from 'next/server';
import { getCurrentUser, verifyPassword } from '@/lib/auth';
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

    // Get password from request body
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to delete a patient' },
        { status: 400 }
      );
    }

    // Verify admin password
    const usersCollection = await getUsersCollection();
    const admin = await usersCollection.findOne({ _id: new ObjectId(currentUser.id) });
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    const isPasswordValid = await verifyPassword(password, admin.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const patientsCollection = await getPatientsCollection();
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

