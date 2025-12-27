import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsersCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

// PUT - Update profile picture
export async function PUT(request) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { profilePic } = await request.json();

    if (!profilePic) {
      return NextResponse.json(
        { error: 'Profile picture URL is required' },
        { status: 400 }
      );
    }

    const usersCollection = await getUsersCollection();
    
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(currentUser.id) },
      { $set: { profilePic } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get updated user
    const updatedUser = await usersCollection.findOne(
      { _id: new ObjectId(currentUser.id) },
      { projection: { password: 0 } }
    );

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        profilePic: updatedUser.profilePic || '',
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

