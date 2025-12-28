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

    // Enhanced email validation - stricter regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Additional validation: check for valid domain structure
    const emailParts = email.split('@');
    if (emailParts.length !== 2) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }
    const domain = emailParts[1];
    // Domain should have at least one dot and valid TLD (2+ characters)
    const domainParts = domain.split('.');
    if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
      return NextResponse.json(
        { error: 'Please enter a valid email address with a valid domain' },
        { status: 400 }
      );
    }
    
    // Stricter domain validation: reject single-letter domain parts (except for known single-letter TLDs like .x, .z)
    // This catches cases like "something@s.com" which are likely invalid
    // Check all parts except the TLD (last part)
    for (let i = 0; i < domainParts.length - 1; i++) {
      if (domainParts[i].length < 2) {
        return NextResponse.json(
          { error: 'Please enter a valid email address. Single-letter domains are not accepted.' },
          { status: 400 }
        );
      }
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

    // Generate verification token FIRST (before creating user)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // 24 hours expiry

    // Hash password
    const hashedPassword = await hashPassword(password);

    // IMPORTANT: Try to send verification email FIRST before creating user
    // This way, if email sending fails with invalid email error, we fail before creating the user
    let emailSent = false;
    let emailError = null;
    try {
      await sendVerificationEmail(email, name, verificationToken);
      emailSent = true;
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
      emailError = emailErr.message || 'Failed to send verification email';
      const errorMsg = emailError.toLowerCase();
      
      // Check if this is an invalid email error (not a temporary service error)
      // If it's an invalid email, fail registration immediately without creating user
      if (
        errorMsg.includes('mail does not exist') ||
        errorMsg.includes('does not exist or is invalid') ||
        errorMsg.includes('invalid email address format') ||
        errorMsg.includes('invalid email address') ||
        (errorMsg.includes('error sending verification mail') && !errorMsg.includes('service'))
      ) {
        return NextResponse.json(
          { error: emailError || 'Error sending verification mail - mail does not exist. Please check the email address and try again.' },
          { status: 400 }
        );
      }
      // For other errors (service configuration, temporary issues), we'll still create the user
      // but mark email as not sent so user can request resend later
    }

    // Create user only after email validation passes (or for temporary errors)
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

    // Return response based on email status
    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: 'Registration successful! Please check your email to verify your account before logging in.',
      });
    } else {
      // Email wasn't sent due to temporary service error (not invalid email, as that would have failed above)
      return NextResponse.json({
        success: true,
        emailSent: false,
        emailError: emailError || undefined,
        message: `Registration successful, but ${emailError || 'verification email could not be sent'}. You can request a verification email resend after logging in.`,
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

