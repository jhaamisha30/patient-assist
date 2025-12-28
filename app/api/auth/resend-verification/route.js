import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsersCollection } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne(
      { _id: new ObjectId(currentUser.id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.verified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 200 }
      );
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // 24 hours expiry

    // Update user with new token
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          verificationToken,
          verificationTokenExpiry,
        },
      }
    );

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
      return NextResponse.json({
        success: true,
        message: 'Verification email sent successfully. Please check your inbox.',
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

