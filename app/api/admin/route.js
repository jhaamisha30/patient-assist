import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsersCollection, getPatientsCollection, getDiagnosticsCollection, getCertificatesCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

// GET - Get all data for admin
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const usersCollection = await getUsersCollection();
    const patientsCollection = await getPatientsCollection();
    const diagnosticsCollection = await getDiagnosticsCollection();

    // Get all doctors (include verified status)
    const doctors = await usersCollection
      .find({ role: 'doctor' }, { projection: { password: 0 } })
      .toArray();

    // Get all patients and populate user info for verified status
    const patients = await patientsCollection.find({}).toArray();
    
    // Get user info for patients to include verified status
    const patientUserIds = patients
      .map(p => p.userId ? new ObjectId(p.userId) : null)
      .filter(Boolean);
    
    let patientUserMap = new Map();
    if (patientUserIds.length > 0) {
      const patientUsers = await usersCollection
        .find({ _id: { $in: patientUserIds } }, { projection: { verified: 1, _id: 1 } })
        .toArray();
      patientUserMap = new Map(patientUsers.map(u => [u._id.toString(), u.verified || false]));
    }
    
    // Add verified status to patients
    const patientsWithVerified = patients.map(p => ({
      ...p,
      verified: p.userId ? (patientUserMap.get(p.userId) || false) : false,
    }));

    // Get all diagnostics
    const diagnostics = await diagnosticsCollection.find({}).toArray();

    // Get all certificates
    const certificatesCollection = await getCertificatesCollection();
    const certificates = await certificatesCollection.find({}).toArray();

    // Populate patient name and attending doctor for each diagnostic
    const populatedDiagnostics = await Promise.all(
      diagnostics.map(async (diagnostic) => {
        const patient = await patientsCollection.findOne({
          _id: new ObjectId(diagnostic.patientId),
        });
        
        let attendingDoctor = null;
        if (diagnostic.doctorId) {
          const doctor = await usersCollection.findOne(
            { _id: new ObjectId(diagnostic.doctorId) },
            { projection: { password: 0 } }
          );
          if (doctor) {
            attendingDoctor = doctor.name;
          }
        }
        
        return {
          ...diagnostic,
          id: diagnostic._id.toString(),
          _id: undefined,
          patientName: patient ? patient.name : diagnostic.patientName || 'Unknown',
          attendingDoctor: attendingDoctor || diagnostic.attendingDoctor || 'Unknown',
        };
      })
    );

    return NextResponse.json({
      doctors: doctors.map(d => ({
        ...d,
        id: d._id.toString(),
        _id: undefined,
      })),
      patients: patientsWithVerified.map(p => ({
        ...p,
        id: p._id.toString(),
        _id: undefined,
      })),
      diagnostics: populatedDiagnostics,
      certificates: certificates.map(c => ({
        ...c,
        id: c._id.toString(),
        _id: undefined,
      })),
    });
  } catch (error) {
    console.error('Admin get data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

