import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDiagnosticsCollection, getPatientsCollection, getUsersCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    const patientsCollection = await getPatientsCollection();
    const usersCollection = await getUsersCollection();

    let patient;
    let diagnostics;
    let doctor = null;

    if (currentUser.role === 'patient') {
      patient = await patientsCollection.findOne({
        userId: currentUser.id,
      });
      
      if (!patient) {
        return NextResponse.json(
          { error: 'Patient record not found' },
          { status: 404 }
        );
      }

      // Fetch doctor information for patient
      if (patient.doctorId) {
        const doctorDoc = await usersCollection.findOne(
          { _id: new ObjectId(patient.doctorId) },
          { projection: { password: 0 } }
        );
        if (doctorDoc) {
          doctor = {
            name: doctorDoc.name,
            email: doctorDoc.email,
          };
        }
      }

      diagnostics = await diagnosticsCollection
        .find({ patientId: patient._id.toString() })
        .sort({ date: -1 })
        .toArray();
    } else if (currentUser.role === 'doctor') {
      if (!patientId) {
        return NextResponse.json(
          { error: 'Patient ID is required' },
          { status: 400 }
        );
      }

      patient = await patientsCollection.findOne({
        _id: new ObjectId(patientId),
        doctorId: currentUser.id,
      });

      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found or unauthorized' },
          { status: 404 }
        );
      }

      // Fetch doctor information (the current user who is exporting)
      const doctorDoc = await usersCollection.findOne(
        { _id: new ObjectId(currentUser.id) },
        { projection: { password: 0 } }
      );
      if (doctorDoc) {
        doctor = {
          name: doctorDoc.name,
          email: doctorDoc.email,
        };
      }

      diagnostics = await diagnosticsCollection
        .find({ patientId: patientId })
        .sort({ date: -1 })
        .toArray();
    }

    // Create PDF
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(34, 139, 34); // Green color
    doc.text('Patient Diagnostic Report', 14, 20);
    
    let yPos = 35;
    
    // Doctor Information (for both patients and doctors)
    if (doctor) {
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Attending Doctor:', 14, yPos);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Dr. ${doctor.name}`, 14, yPos + 7);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(doctor.email, 14, yPos + 14);
      yPos += 25;
    }
    
    // Patient Information
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Patient Information:', 14, yPos);
    yPos += 7;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Patient Name: ${patient.name}`, 14, yPos);
    doc.text(`Age: ${patient.age}`, 14, yPos + 7);
    doc.text(`Email: ${patient.email}`, 14, yPos + 14);
    let infoY = yPos + 21;
    if (patient.phone) {
      doc.text(`Phone: ${patient.phone}`, 14, infoY);
      infoY += 7;
    }
    if (patient.address) {
      doc.text(`Address: ${patient.address}`, 14, infoY);
      infoY += 7;
    }
    yPos = infoY + 5;

    // Diagnostic Records Table
    if (diagnostics.length > 0) {
      const tableData = diagnostics.map(d => [
        new Date(d.date).toLocaleDateString(),
        d.diagnosis,
        d.symptoms || 'N/A',
        d.treatment || 'N/A',
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Diagnosis', 'Symptoms', 'Treatment']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34] },
        styles: { fontSize: 9 },
      });
    } else {
      doc.text('No diagnostic records found.', 14, yPos);
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="patient-report-${patient.name}-${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

