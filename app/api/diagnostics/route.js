import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDiagnosticsCollection, getPatientsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

// GET - Get diagnostics for a patient
export async function GET(request) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    const diagnosticsCollection = await getDiagnosticsCollection();
    let query = {};

    if (currentUser.role === 'patient') {
      // Patient can only see their own diagnostics
      const patientsCollection = await getPatientsCollection();
      const patient = await patientsCollection.findOne({
        userId: currentUser.id,
      });
      
      if (!patient) {
        return NextResponse.json({ diagnostics: [] });
      }
      
      query.patientId = patient._id.toString();
    } else if (currentUser.role === 'doctor') {
      // Doctor can see diagnostics for their patients
      if (patientId) {
        query.patientId = patientId;
        // Verify patient belongs to doctor
        const patientsCollection = await getPatientsCollection();
        const patient = await patientsCollection.findOne({
          _id: new ObjectId(patientId),
          doctorId: currentUser.id,
        });
        
        if (!patient) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          );
        }
      } else {
        // Get all patients for this doctor
        const patientsCollection = await getPatientsCollection();
        const patients = await patientsCollection
          .find({ doctorId: currentUser.id })
          .toArray();
        const patientIds = patients.map(p => p._id.toString());
        query.patientId = { $in: patientIds };
      }
    }

    const diagnostics = await diagnosticsCollection
      .find(query)
      .sort({ date: -1 })
      .toArray();

    return NextResponse.json({ diagnostics });
  } catch (error) {
    console.error('Get diagnostics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a new diagnostic record
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
      patientId,
      diagnosis,
      symptoms,
      treatment,
      notes,
      date,
    } = await request.json();

    if (!patientId || !diagnosis) {
      return NextResponse.json(
        { error: 'Patient ID and diagnosis are required' },
        { status: 400 }
      );
    }

    // Verify patient belongs to doctor
    const patientsCollection = await getPatientsCollection();
    const patient = await patientsCollection.findOne({
      _id: new ObjectId(patientId),
      doctorId: currentUser.id,
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found or unauthorized' },
        { status: 404 }
      );
    }

    const diagnosticsCollection = await getDiagnosticsCollection();
    
    const diagnostic = {
      patientId: patientId,
      doctorId: currentUser.id,
      diagnosis,
      symptoms: symptoms || '',
      treatment: treatment || '',
      notes: notes || '',
      date: date ? new Date(date) : new Date(),
      createdAt: new Date(),
    };

    const result = await diagnosticsCollection.insertOne(diagnostic);

    return NextResponse.json({
      success: true,
      diagnostic: {
        id: result.insertedId.toString(),
        ...diagnostic,
      },
    });
  } catch (error) {
    console.error('Add diagnostic error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

