import { NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      // Redirect to login with error
      return NextResponse.redirect(new URL('/login?error=no_token', request.url));
    }

    const usersCollection = await getUsersCollection();
    
    // Find user with matching token
    const user = await usersCollection.findOne({
      verificationToken: token,
    });

    if (!user) {
      // Redirect to login with error
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    // Check if token has expired
    if (user.verificationTokenExpiry && new Date() > new Date(user.verificationTokenExpiry)) {
      // Redirect to login with error
      return NextResponse.redirect(new URL('/login?error=expired_token', request.url));
    }

    // Check if already verified
    if (user.verified) {
      // Redirect to login with success message
      return NextResponse.redirect(new URL('/login?verified=true&message=already_verified', request.url));
    }

    // Update user to verified
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          verified: true,
        },
        $unset: {
          verificationToken: '',
          verificationTokenExpiry: '',
        },
      }
    );

    // Redirect to login with success message
    return NextResponse.redirect(new URL('/login?verified=true&message=success', request.url));
  } catch (error) {
    console.error('Email verification error:', error);
    // Redirect to login with error
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}

