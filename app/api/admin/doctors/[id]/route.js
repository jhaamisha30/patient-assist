import { NextResponse } from 'next/server';
import { getCurrentUser, verifyPassword } from '@/lib/auth';
import { getUsersCollection, getPatientsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

// DELETE - Delete a doctor
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
        { error: 'Password is required to delete a doctor' },
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

    // Don't allow deleting self
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Find the doctor
    const doctor = await usersCollection.findOne({
      _id: new ObjectId(id),
      role: 'doctor',
    });

    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // Unassign all patients from this doctor
    await patientsCollection.updateMany(
      { doctorId: id },
      { $set: { doctorId: null } }
    );

    // Delete the doctor's user account
    await usersCollection.deleteOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({
      success: true,
      message: 'Doctor deleted successfully',
    });
  } catch (error) {
    console.error('Delete doctor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

