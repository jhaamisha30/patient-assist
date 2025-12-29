import { NextResponse } from 'next/server';
import { getCurrentUser, verifyPassword } from '@/lib/auth';
import { getLabReportsCollection, getPatientsCollection, getDoctorsCollection, getUsersCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

// GET - list lab reports
export async function GET(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const searchQuery = searchParams.get('search'); // For admin search

    const labReportsCollection = await getLabReportsCollection();
    const patientsCollection = await getPatientsCollection();
    const doctorsCollection = await getDoctorsCollection();
    const usersCollection = await getUsersCollection();

    let query = {};

    if (currentUser.role === 'doctor') {
      // Get doctor's doctorId from doctors collection
      const doctor = await doctorsCollection.findOne({ userId: currentUser.id });
      if (!doctor) {
        return NextResponse.json({ labReports: [] });
      }
      
      if (patientId) {
        // Get specific patient's lab reports
        const patient = await patientsCollection.findOne({
          _id: new ObjectId(patientId),
          doctorId: doctor.doctorId,
        });
        if (!patient) {
          return NextResponse.json({ labReports: [] });
        }
        query.patientId = patientId;
      } else {
        // Get all lab reports for doctor's patients
        const doctorPatients = await patientsCollection
          .find({ doctorId: doctor.doctorId })
          .toArray();
        const patientIds = doctorPatients.map(p => p._id.toString());
        if (patientIds.length === 0) {
          return NextResponse.json({ labReports: [] });
        }
        query.patientId = { $in: patientIds };
      }
    } else if (currentUser.role === 'patient') {
      // Patients can only see their own lab reports
      const patient = await patientsCollection.findOne({ userId: currentUser.id });
      if (!patient) {
        return NextResponse.json({ labReports: [] });
      }
      query.patientId = patient._id.toString();
    } else if (currentUser.role === 'admin') {
      // Admin can see all lab reports, optionally filtered by search
      if (searchQuery && searchQuery.trim()) {
        const search = searchQuery.trim();
        // Search by doctor name, patient name, or UHID
        const doctorDocs = await doctorsCollection.find({
          $or: [
            { uhid: { $regex: search, $options: 'i' } },
          ]
        }).toArray();
        
        const doctorIds = doctorDocs.map(d => d.doctorId);
        const doctorUserIds = doctorDocs.map(d => d.userId);
        
        // Get doctors by name from users collection
        const doctorUsers = await usersCollection.find({
          _id: { $in: doctorUserIds.map(id => new ObjectId(id)) },
          name: { $regex: search, $options: 'i' }
        }).toArray();
        
        const doctorUsersIds = doctorUsers.map(u => u._id.toString());
        const doctorUsersDocs = await doctorsCollection.find({
          userId: { $in: doctorUsersIds }
        }).toArray();
        
        const allDoctorIds = [...new Set([...doctorIds, ...doctorUsersDocs.map(d => d.doctorId)])];
        
        // Get patients by name or UHID
        const patientDocs = await patientsCollection.find({
          $or: [
            { uhid: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } }
          ]
        }).toArray();
        
        const patientIds = patientDocs.map(p => p._id.toString());
        
        // Build query
        const orConditions = [];
        if (allDoctorIds.length > 0) {
          orConditions.push({ doctorId: { $in: allDoctorIds } });
        }
        if (patientIds.length > 0) {
          orConditions.push({ patientId: { $in: patientIds } });
        }
        
        if (orConditions.length > 0) {
          query.$or = orConditions;
        } else {
          // No matches found
          return NextResponse.json({ labReports: [] });
        }
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const labReports = await labReportsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Populate doctor and patient information
    const populatedReports = await Promise.all(
      labReports.map(async (report) => {
        let doctorInfo = null;
        let patientInfo = null;

        if (report.doctorId) {
          const doctorDoc = await doctorsCollection.findOne({ doctorId: report.doctorId });
          if (doctorDoc) {
            const doctorUser = await usersCollection.findOne(
              { _id: new ObjectId(doctorDoc.userId) },
              { projection: { name: 1, email: 1 } }
            );
            if (doctorUser) {
              doctorInfo = {
                name: doctorUser.name,
                email: doctorUser.email,
                uhid: doctorDoc.uhid || '',
              };
            }
          }
        }

        if (report.patientId) {
          const patient = await patientsCollection.findOne({
            _id: new ObjectId(report.patientId),
          });
          if (patient) {
            patientInfo = {
              name: patient.name,
              uhid: patient.uhid || '',
            };
          }
        }

        return {
          ...report,
          id: report._id.toString(),
          _id: undefined,
          doctor: doctorInfo,
          patient: patientInfo,
        };
      })
    );

    return NextResponse.json({
      labReports: populatedReports,
    });
  } catch (error) {
    console.error('Get lab reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - create lab report (doctor only, requires password)
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      patientId,
      labReportFile,
      description,
      password,
    } = await request.json();

    if (!patientId || !labReportFile || !password) {
      return NextResponse.json(
        { error: 'Patient ID, lab report file, and password are required' },
        { status: 400 }
      );
    }

    // Verify doctor password
    const usersCollection = await getUsersCollection();
    const doctorUser = await usersCollection.findOne({ _id: new ObjectId(currentUser.id) });
    if (!doctorUser) {
      return NextResponse.json(
        { error: 'Doctor user not found' },
        { status: 404 }
      );
    }

    const isPasswordValid = await verifyPassword(password, doctorUser.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    const labReportsCollection = await getLabReportsCollection();
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

    // Verify patient belongs to this doctor
    const patient = await patientsCollection.findOne({
      _id: new ObjectId(patientId),
      doctorId: doctor.doctorId,
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found or unauthorized' },
        { status: 404 }
      );
    }

    const labReport = {
      patientId: patientId,
      patientName: patient.name,
      patientUHID: patient.uhid || '',
      doctorId: doctor.doctorId,
      doctorName: doctorUser.name,
      doctorUHID: doctor.uhid || '',
      labReportFile: labReportFile,
      description: description || '',
      createdAt: new Date(),
    };

    const result = await labReportsCollection.insertOne(labReport);

    return NextResponse.json({
      success: true,
      labReport: { ...labReport, id: result.insertedId.toString() },
    });
  } catch (error) {
    console.error('Create lab report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - delete lab report (doctor or admin, requires password)
export async function DELETE(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'doctor' && currentUser.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, password } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Lab report id is required' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Password is required for deletion' }, { status: 400 });
    }

    const labReportsCollection = await getLabReportsCollection();
    const usersCollection = await getUsersCollection();
    const doctorsCollection = await getDoctorsCollection();

    // Verify password
    const user = await usersCollection.findOne({ _id: new ObjectId(currentUser.id) });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Find the report
    const report = await labReportsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!report) {
      return NextResponse.json({ error: 'Lab report not found' }, { status: 404 });
    }

    // Verify authorization
    if (currentUser.role === 'doctor') {
      const doctor = await doctorsCollection.findOne({ userId: currentUser.id });
      if (!doctor || doctor.doctorId !== report.doctorId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }
    // Admin can delete any report

    await labReportsCollection.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete lab report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

