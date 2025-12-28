import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { getUsersCollection, getPatientsCollection } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { email, password, name, role, profilePic, doctorId, age, vitals } = await request.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Allow doctor and patient registration
    if (role !== 'doctor' && role !== 'patient') {
      return NextResponse.json(
        { error: 'Invalid role. Only doctors and patients can register.' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
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

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // 24 hours expiry

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = {
      email,
      password: hashedPassword,
      name,
      role,
      profilePic: profilePic || '',
      verified: false,
      verificationToken,
      verificationTokenExpiry,
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(user);
    user._id = result.insertedId;

    // Send verification email
    try {
      await sendVerificationEmail(email, name, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails, but log it
      // User can request resend later
    }

    // If patient, create patient record
    if (role === 'patient') {
      const patientsCollection = await getPatientsCollection();
      let currentDoctor = '';
      
      if (doctorId) {
        const selectedDoctor = await usersCollection.findOne(
          { _id: new ObjectId(doctorId), role: 'doctor' },
          { projection: { password: 0 } }
        );
        if (selectedDoctor) {
          currentDoctor = selectedDoctor.name;
        }
      }

      // Prepare vitals object with provided values or defaults
      const patientVitals = vitals ? {
        bloodPressure: vitals.bloodPressure || '',
        heartRate: vitals.heartRate || '',
        temperature: vitals.temperature || '',
        weight: vitals.weight || '',
        height: vitals.height || '',
        bloodSugar: vitals.bloodSugar || '',
      } : {
        bloodPressure: '',
        heartRate: '',
        temperature: '',
        weight: '',
        height: '',
        bloodSugar: '',
      };

      // Set vitalsLastUpdated if any vital is provided
      const hasVitals = Object.values(patientVitals).some(v => v && v.trim() !== '');
      const vitalsLastUpdated = hasVitals ? new Date() : null;

      const patient = {
        userId: user._id.toString(),
        doctorId: doctorId || null,
        currentDoctor: currentDoctor,
        name,
        age: age ? parseInt(age) : 0,
        email,
        gender: '',
        phone: '',
        address: '',
        medicalHistory: '',
        allergies: '',
        currentMedications: '',
        vitals: patientVitals,
        vitalsLastUpdated: vitalsLastUpdated,
        createdAt: new Date(),
      };

      await patientsCollection.insertOne(patient);
    }

    // Do NOT log the user in - they must verify their email first
    // Token generation and cookie setting removed

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account before logging in.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

