import { NextResponse } from 'next/server';
import { getCurrentUser, verifyPassword } from '@/lib/auth';
import { getCertificatesCollection, getUsersCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

// DELETE - admin delete certificate (requires password)
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const usersCollection = await getUsersCollection();
    const admin = await usersCollection.findOne({ _id: new ObjectId(currentUser.id) });
    if (!admin) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    const isPasswordValid = await verifyPassword(password, admin.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const { id } = await params;
    const certificatesCollection = await getCertificatesCollection();

    const cert = await certificatesCollection.findOne({ _id: new ObjectId(id) });
    if (!cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    await certificatesCollection.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true, message: 'Certificate deleted successfully' });
  } catch (error) {
    console.error('Admin delete certificate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

