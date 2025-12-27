import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPatientsCollection, getUsersCollection, getDiagnosticsCollection } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
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

// PUT - Update patient information
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { name, age, password, vitals } = await request.json();

    const patientsCollection = await getPatientsCollection();
    const usersCollection = await getUsersCollection();

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

    // Update patient record
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (age !== undefined) updateData.age = parseInt(age);
    if (vitals !== undefined) {
      updateData.vitals = vitals;
      updateData.vitalsLastUpdated = new Date();
    }

    if (Object.keys(updateData).length > 0) {
      await patientsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
    }

    // Update user account if name or password is provided
    if (patient.userId) {
      const userUpdateData = {};
      if (name !== undefined) userUpdateData.name = name;
      if (password !== undefined && password.trim() !== '') {
        const hashedPassword = await hashPassword(password);
        userUpdateData.password = hashedPassword;
      }

      if (Object.keys(userUpdateData).length > 0) {
        await usersCollection.updateOne(
          { _id: new ObjectId(patient.userId) },
          { $set: userUpdateData }
        );
      }
    }

    // Get updated patient
    const updatedPatient = await patientsCollection.findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({
      success: true,
      patient: updatedPatient,
      message: 'Patient updated successfully',
    });
  } catch (error) {
    console.error('Update patient error:', error);
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

