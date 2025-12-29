import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsersCollection, getPatientsCollection, getDiagnosticsCollection, getCertificatesCollection, getDoctorsCollection } from '@/lib/db';
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
    const doctorsCollection = await getDoctorsCollection();

    // Get all doctors from doctors collection and populate user info for verified status
    const doctorsDocs = await doctorsCollection.find({}).toArray();
    
    // Get user info for doctors to include verified status
    const doctorUserIds = doctorsDocs
      .map(d => d.userId ? new ObjectId(d.userId) : null)
      .filter(Boolean);
    
    let doctorUserMap = new Map();
    if (doctorUserIds.length > 0) {
      const doctorUsers = await usersCollection
        .find({ _id: { $in: doctorUserIds } }, { projection: { verified: 1, _id: 1, name: 1, email: 1, profilePic: 1 } })
        .toArray();
      doctorUserMap = new Map(doctorUsers.map(u => [u._id.toString(), u]));
    }
    
    // Combine doctor records with user info
    const doctors = doctorsDocs.map(d => {
      const userInfo = doctorUserMap.get(d.userId);
      return {
        ...d,
        id: d.doctorId, // Use doctorId as id for consistency
        _id: undefined,
        name: userInfo?.name || d.name,
        email: userInfo?.email || d.email,
        profilePic: userInfo?.profilePic || '',
        verified: userInfo?.verified || false,
        uhid: d.uhid || '', // Include doctor's UHID
      };
    });

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
          // Try to find doctor by doctorId first (from doctors collection)
          const doctor = await doctorsCollection.findOne({ doctorId: diagnostic.doctorId });
          if (doctor) {
            const doctorUser = doctorUserMap.get(doctor.userId);
            attendingDoctor = doctorUser?.name || doctor.name;
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
      doctors: doctors,
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

