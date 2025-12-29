import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCertificatesCollection, getPatientsCollection, getDoctorsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

// GET - list certificates
export async function GET(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const certificatesCollection = await getCertificatesCollection();
    const patientsCollection = await getPatientsCollection();
    const doctorsCollection = await getDoctorsCollection();

    let query = {};

    if (currentUser.role === 'doctor') {
      // Get doctor's doctorId from doctors collection
      const doctor = await doctorsCollection.findOne({ userId: currentUser.id });
      if (!doctor) {
        return NextResponse.json({ certificates: [] });
      }
      query.certificateOfDoctor = doctor.doctorId;
    } else if (currentUser.role === 'patient') {
      // Patients can see only public certificates; determine doctor
      let doctorToView = doctorId;
      if (!doctorToView) {
        const patient = await patientsCollection.findOne({ userId: currentUser.id });
        if (patient && patient.doctorId) {
          doctorToView = patient.doctorId; // patient.doctorId is now the doctorId string
        }
      }
      if (!doctorToView) {
        return NextResponse.json({ certificates: [] });
      }
      query = { certificateOfDoctor: doctorToView, isPublic: true };
    } else if (currentUser.role === 'admin') {
      if (doctorId) {
        query.certificateOfDoctor = doctorId; // doctorId is already the doctorId string
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const certificates = await certificatesCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      certificates: certificates.map((c) => ({
        ...c,
        id: c._id.toString(),
        _id: undefined,
      })),
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - create certificate (doctor only)
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { certificateTitle, certificateDescription, certificateImage, isPublic = false } =
      await request.json();

    if (!certificateTitle || !certificateDescription || !certificateImage) {
      return NextResponse.json(
        { error: 'Title, description, and image are required' },
        { status: 400 }
      );
    }

    const certificatesCollection = await getCertificatesCollection();
    const doctorsCollection = await getDoctorsCollection();
    
    // Get doctor's doctorId from doctors collection
    const doctor = await doctorsCollection.findOne({ userId: currentUser.id });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor record not found' },
        { status: 404 }
      );
    }
    
    const doc = {
      certificateTitle,
      certificateDescription,
      certificateImage,
      certificateOfDoctor: doctor.doctorId, // Store doctorId instead of userId
      certificateOfDoctorUHID: doctor.uhid || '', // Store doctor's UHID
      isPublic: !!isPublic,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await certificatesCollection.insertOne(doc);

    return NextResponse.json({
      success: true,
      certificate: { ...doc, id: result.insertedId.toString() },
    });
  } catch (error) {
    console.error('Create certificate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - update certificate public/private (doctor only)
export async function PATCH(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, isPublic } = await request.json();
    if (!id || typeof isPublic !== 'boolean') {
      return NextResponse.json(
        { error: 'Certificate id and isPublic are required' },
        { status: 400 }
      );
    }

    const certificatesCollection = await getCertificatesCollection();
    const doctorsCollection = await getDoctorsCollection();
    
    // Get doctor's doctorId from doctors collection
    const doctor = await doctorsCollection.findOne({ userId: currentUser.id });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor record not found' },
        { status: 404 }
      );
    }
    
    const cert = await certificatesCollection.findOne({
      _id: new ObjectId(id),
      certificateOfDoctor: doctor.doctorId,
    });
    if (!cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    await certificatesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isPublic, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update certificate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - delete certificate (doctor only)
export async function DELETE(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Certificate id is required' }, { status: 400 });
    }

    const certificatesCollection = await getCertificatesCollection();
    const doctorsCollection = await getDoctorsCollection();
    
    // Get doctor's doctorId from doctors collection
    const doctor = await doctorsCollection.findOne({ userId: currentUser.id });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor record not found' },
        { status: 404 }
      );
    }
    
    const cert = await certificatesCollection.findOne({
      _id: new ObjectId(id),
      certificateOfDoctor: doctor.doctorId,
    });
    if (!cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    await certificatesCollection.deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete certificate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

