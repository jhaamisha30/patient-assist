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
    yPos = infoY + 10;

    // Vitals Section
    if (patient.vitals) {
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Vitals:', 14, yPos);
      yPos += 7;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      
      let vitalsY = yPos;
      if (patient.vitals.bloodPressure) {
        doc.text(`Blood Pressure: ${patient.vitals.bloodPressure}`, 14, vitalsY);
        vitalsY += 7;
      }
      if (patient.vitals.heartRate) {
        doc.text(`Heart Rate: ${patient.vitals.heartRate} bpm`, 14, vitalsY);
        vitalsY += 7;
      }
      if (patient.vitals.temperature) {
        doc.text(`Temperature: ${patient.vitals.temperature} °F`, 14, vitalsY);
        vitalsY += 7;
      }
      if (patient.vitals.weight) {
        doc.text(`Weight: ${patient.vitals.weight} kg`, 14, vitalsY);
        vitalsY += 7;
      }
      if (patient.vitals.height) {
        doc.text(`Height: ${patient.vitals.height} cm`, 14, vitalsY);
        vitalsY += 7;
      }
      if (patient.vitals.bloodSugar) {
        doc.text(`Blood Sugar: ${patient.vitals.bloodSugar} mg/dL`, 14, vitalsY);
        vitalsY += 7;
      }
      
      // Last Updated timestamp
      if (patient.vitalsLastUpdated) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Vitals Last Updated: ${new Date(patient.vitalsLastUpdated).toLocaleString()}`, 14, vitalsY + 3);
        vitalsY += 10;
      }
      
      yPos = vitalsY + 5;
    }

    // Diagnostic Records - Detailed Format (scalable for future fields)
    if (diagnostics.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(34, 139, 34);
      doc.text('Diagnostic Records', 14, yPos);
      yPos += 10;

      diagnostics.forEach((diagnostic, index) => {
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        // Diagnostic header with background
        doc.setFillColor(240, 240, 240);
        doc.rect(14, yPos - 5, 182, 8, 'F');
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Diagnostic Record #${index + 1}`, 14, yPos);
        yPos += 10;

        // Diagnostic details in a structured format
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        
        const details = [
          { label: 'Date', value: new Date(diagnostic.date).toLocaleDateString() },
          { label: 'Patient Name', value: diagnostic.patientName || patient.name },
          { label: 'Attending Doctor', value: diagnostic.attendingDoctor || doctor?.name || 'N/A' },
          { label: 'Diagnosis', value: diagnostic.diagnosis },
        ];

        // Display basic details
        details.forEach(detail => {
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`${detail.label}:`, 14, yPos);
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          const textLines = doc.splitTextToSize(detail.value, 160);
          doc.text(textLines, 60, yPos);
          yPos += textLines.length * 5 + 3;
        });

        // Multi-line fields (Symptoms, Treatment, Notes)
        const multiLineFields = [
          { label: 'Symptoms', value: diagnostic.symptoms },
          { label: 'Treatment', value: diagnostic.treatment },
          { label: 'Notes', value: diagnostic.notes },
        ];

        multiLineFields.forEach(field => {
          if (field.value && field.value.trim() !== '') {
            // Check if we need a new page
            if (yPos > 250) {
              doc.addPage();
              yPos = 20;
            }
            
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`${field.label}:`, 14, yPos);
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            const textLines = doc.splitTextToSize(field.value, 160);
            doc.text(textLines, 14, yPos + 5);
            yPos += textLines.length * 5 + 8;
          }
        });

        // Separator line between diagnostics
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 10;
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

