import { NextResponse } from 'next/server';
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { getUsersCollection } from '@/lib/db';

export async function POST(request) {
  try {
    const { email, password, name, role, profilePic } = await request.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Only allow doctor registration - patients are created by doctors
    if (role !== 'doctor') {
      return NextResponse.json(
        { error: 'Only doctors can register. Patients receive credentials from their doctor.' },
        { status: 400 }
      );
    }

    const usersCollection = await getUsersCollection();
    
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = {
      email,
      password: hashedPassword,
      name,
      role,
      profilePic: profilePic || '',
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(user);
    user._id = result.insertedId;

    // Generate token
    const token = generateToken(user);

    // Set cookie
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

