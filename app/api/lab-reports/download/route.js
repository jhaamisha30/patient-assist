import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getLabReportsCollection, getPatientsCollection, getDoctorsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
    }

    const labReportsCollection = await getLabReportsCollection();
    const patientsCollection = await getPatientsCollection();
    const doctorsCollection = await getDoctorsCollection();

    // Find the lab report
    const report = await labReportsCollection.findOne({
      _id: new ObjectId(reportId),
    });

    if (!report) {
      return NextResponse.json({ error: 'Lab report not found' }, { status: 404 });
    }

    // Check authorization
    if (currentUser.role === 'patient') {
      const patient = await patientsCollection.findOne({ userId: currentUser.id });
      if (!patient || patient._id.toString() !== report.patientId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else if (currentUser.role === 'doctor') {
      const doctor = await doctorsCollection.findOne({ userId: currentUser.id });
      if (!doctor || doctor.doctorId !== report.doctorId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }
    // Admin can access all reports

    // Fetch the file from Cloudinary URL
    const fileResponse = await fetch(report.labReportFile);
    if (!fileResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    
    // Determine content type based on file extension or URL
    let contentType = 'application/pdf';
    let fileExtension = 'pdf';
    const url = report.labReportFile.toLowerCase();
    
    if (url.includes('.jpg') || url.includes('.jpeg')) {
      contentType = 'image/jpeg';
      fileExtension = 'jpg';
    } else if (url.includes('.png')) {
      contentType = 'image/png';
      fileExtension = 'png';
    } else if (url.includes('.pdf')) {
      contentType = 'application/pdf';
      fileExtension = 'pdf';
    } else {
      // Try to detect from Cloudinary response headers
      const cloudinaryContentType = fileResponse.headers.get('content-type');
      if (cloudinaryContentType) {
        contentType = cloudinaryContentType;
        if (cloudinaryContentType.includes('pdf')) {
          fileExtension = 'pdf';
        } else if (cloudinaryContentType.includes('jpeg')) {
          fileExtension = 'jpg';
        } else if (cloudinaryContentType.includes('png')) {
          fileExtension = 'png';
        }
      }
    }

    // Return the file with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="lab-report-${reportId}.${fileExtension}"`,
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Download lab report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

