import { NextResponse } from 'next/server';
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { getUsersCollection, getPatientsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

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

