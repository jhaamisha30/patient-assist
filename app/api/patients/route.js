import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPatientsCollection, getUsersCollection, getDoctorsCollection } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import { generateUHID } from '@/lib/uhid';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

// GET - Get all patients for a doctor (including unassigned)
export async function GET(request) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeUnassigned = searchParams.get('unassigned') === 'true';

    const patientsCollection = await getPatientsCollection();
    const doctorsCollection = await getDoctorsCollection();
    
    // Get doctor's doctorId from doctors collection
    const doctor = await doctorsCollection.findOne({ userId: currentUser.id });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor record not found' },
        { status: 404 }
      );
    }
    
    let query = { doctorId: doctor.doctorId };
    
    // If requesting unassigned patients, get those without a doctor
    if (includeUnassigned) {
      query = { $or: [{ doctorId: null }, { doctorId: '' }] };
    }

    const patients = await patientsCollection.find(query).toArray();

    // Patients already include uhid from collection, so just return them
    return NextResponse.json(
      { patients },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Get patients error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a new patient
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const {
      name,
      age,
      email,
      password,
      bloodGroup,
      gender,
      phone,
      address,
      medicalHistory,
      allergies,
      currentMedications,
      vitals,
    } = await request.json();

    if (!name || !age || !email || !password) {
      return NextResponse.json(
        { error: 'Name, age, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate blood group
    if (!bloodGroup) {
      return NextResponse.json(
        { error: 'Blood group is required' },
        { status: 400 }
      );
    }

    // Validate blood group format
    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!validBloodGroups.includes(bloodGroup)) {
      return NextResponse.json(
        { error: 'Invalid blood group' },
        { status: 400 }
      );
    }

    const usersCollection = await getUsersCollection();
    const patientsCollection = await getPatientsCollection();
    const doctorsCollection = await getDoctorsCollection();

    // Check if patient email already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Get doctor information from doctors collection
    const doctor = await doctorsCollection.findOne({ userId: currentUser.id });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor record not found' },
        { status: 404 }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // 24 hours expiry

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user account for patient
    const patientUser = {
      email,
      password: hashedPassword,
      name,
      role: 'patient',
      profilePic: '',
      verified: false,
      verificationToken,
      verificationTokenExpiry,
      createdAt: new Date(),
    };

    const userResult = await usersCollection.insertOne(patientUser);
    const patientUserId = userResult.insertedId.toString();

    // Get the count of existing patients to generate sequential patientId
    const patientCount = await patientsCollection.countDocuments();
    const patientIdNum = patientCount + 1;
    const patientId = String(patientIdNum).padStart(9, '0'); // Generate 9-digit ID, e.g., "000000001"
    
    // Generate UHID
    const uhid = generateUHID(name, patientId);

    // Create patient record
    const patient = {
      userId: patientUserId,
      patientId: patientId,
      uhid: uhid,
      doctorId: doctor.doctorId,
      currentDoctor: doctor.name,
      name,
      age: parseInt(age),
      email,
      bloodGroup: bloodGroup,
      gender: gender || '',
      phone: phone || '',
      address: address || '',
      medicalHistory: medicalHistory || '',
      allergies: allergies || '',
      currentMedications: currentMedications || '',
      vitals: vitals || {
        bloodPressure: '',
        heartRate: '',
        temperature: '',
        weight: '',
        height: '',
        bloodSugar: '',
      },
      vitalsLastUpdated: new Date(),
      createdAt: new Date(),
    };

    const patientResult = await patientsCollection.insertOne(patient);

    // Send verification email to patient with doctor's name
    let emailError = null;
    try {
      await sendVerificationEmail(email, name, verificationToken, doctor ? doctor.name : null);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
      emailError = emailErr.message || 'Failed to send verification email';
      // Don't fail patient creation if email fails, but include error in response
    }

    return NextResponse.json({
      success: true,
      patient: {
        id: patientResult.insertedId.toString(),
        ...patient,
      },
      emailSent: !emailError,
      emailError: emailError || undefined,
      message: emailError 
        ? `Patient created successfully, but ${emailError.toLowerCase()}. Please ensure the email address is valid.`
        : 'Patient created successfully. Verification email has been sent.',
    });
  } catch (error) {
    console.error('Add patient error:', error);
    
    // Check if it's an email-related error
    if (error.message && error.message.includes('email')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

