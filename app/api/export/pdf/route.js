import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDiagnosticsCollection, getPatientsCollection, getUsersCollection, getDoctorsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

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
    const doctorsCollection = await getDoctorsCollection();

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

      // Fetch doctor information for patient from doctors collection
      if (patient.doctorId) {
        const doctorDoc = await doctorsCollection.findOne({ doctorId: patient.doctorId });
        if (doctorDoc) {
          const doctorUser = await usersCollection.findOne(
            { _id: new ObjectId(doctorDoc.userId) },
            { projection: { name: 1, email: 1 } }
          );
          if (doctorUser) {
            doctor = {
              name: doctorUser.name,
              email: doctorUser.email,
              uhid: doctorDoc.uhid || '', // Include doctor's UHID
            };
          }
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

      // Get doctor's doctorId from doctors collection
      const currentDoctorDoc = await doctorsCollection.findOne({ userId: currentUser.id });
      if (!currentDoctorDoc) {
        return NextResponse.json(
          { error: 'Doctor record not found' },
          { status: 404 }
        );
      }

      patient = await patientsCollection.findOne({
        _id: new ObjectId(patientId),
        doctorId: currentDoctorDoc.doctorId,
      });

      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found or unauthorized' },
          { status: 404 }
        );
      }

      // Fetch doctor information (the current user who is exporting)
      const doctorUser = await usersCollection.findOne(
        { _id: new ObjectId(currentDoctorDoc.userId) },
        { projection: { name: 1, email: 1 } }
      );
      if (doctorUser) {
        doctor = {
          name: doctorUser.name,
          email: doctorUser.email,
          uhid: currentDoctorDoc.uhid || '', // Include doctor's UHID
        };
      }

      diagnostics = await diagnosticsCollection
        .find({ patientId: patientId })
        .sort({ date: -1 })
        .toArray();
    }

    // Create PDF
    const doc = new jsPDF();
    
    // Helper function to add logo to a page
    const addLogoToPage = (pdfDoc) => {
      try {
        // Try to load the Patient Assist logo (PNG version for jsPDF compatibility)
        const iconPath = path.join(process.cwd(), 'public', 'icon-512.png');
        
        if (fs.existsSync(iconPath)) {
          const logoBuffer = fs.readFileSync(iconPath);
          const logoData = 'data:image/png;base64,' + logoBuffer.toString('base64');
          // Add logo at top center
          // Page width is 210mm, logo width 40mm, so center at (210-40)/2 = 85mm
          pdfDoc.addImage(logoData, 'PNG', 85, 8, 40, 40); // x, y, width, height (in mm)
        }
      } catch (logoError) {
        console.error('Error loading logo:', logoError);
        // Continue without logo if it fails
      }
    };

    // Add logo at the top of first page
    addLogoToPage(doc);
    
    // Header text below logo
    doc.setFontSize(20);
    doc.setTextColor(34, 139, 34); // Green color
    doc.text('Patient Diagnostic Report', 14, 60);
    
    let yPos = 75;
    
    // Patient UHID at the top
    if (patient.uhid) {
      doc.setFontSize(11);
      doc.setTextColor(34, 139, 34);
      doc.text(`Patient UHID: ${patient.uhid}`, 14, yPos);
      yPos += 10;
    }
    
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
      if (doctor.uhid) {
        doc.setFontSize(10);
        doc.setTextColor(34, 139, 34);
        doc.text(`Doctor UHID: ${doctor.uhid}`, 14, yPos + 21);
        yPos += 28;
      } else {
        yPos += 25;
      }
    }
    
    // Patient Information - Basic Details
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Basic Details:', 14, yPos);
    yPos += 7;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Name: ${patient.name}`, 14, yPos);
    doc.text(`Age: ${patient.age}`, 14, yPos + 7);
    if (patient.gender) {
      doc.text(`Gender: ${patient.gender}`, 14, yPos + 14);
      yPos += 7;
    }
    doc.text(`Blood Group: ${patient.bloodGroup || 'Not specified'}`, 14, yPos + 14);
    doc.text(`Email: ${patient.email}`, 14, yPos + 21);
    let infoY = yPos + 28;
    if (patient.phone) {
      doc.text(`Phone: ${patient.phone}`, 14, infoY);
      infoY += 7;
    }
    if (patient.address) {
      const addressLines = doc.splitTextToSize(`Address: ${patient.address}`, 160);
      doc.text(addressLines, 14, infoY);
      infoY += addressLines.length * 5;
    }
    if (patient.dateOfAdmission) {
      doc.text(`Date of Admission: ${patient.dateOfAdmission}`, 14, infoY);
      infoY += 7;
    }
    // Always show CC field (even if empty, to match Excel export behavior)
    const ccValue = patient.cc && patient.cc.trim() !== '' ? patient.cc : 'N/A';
    const ccLines = doc.splitTextToSize(`CC (Chief Complaint): ${ccValue}`, 160);
    doc.text(ccLines, 14, infoY);
    infoY += ccLines.length * 5;
    // Always show History of Present Illness field
    const hpiValue = patient.historyOfPresentIllness && patient.historyOfPresentIllness.trim() !== '' ? patient.historyOfPresentIllness : 'N/A';
    const hpiLines = doc.splitTextToSize(`History of Present Illness: ${hpiValue}`, 160);
    doc.text(hpiLines, 14, infoY);
    infoY += hpiLines.length * 5;
    yPos = infoY + 10;

    // History Section
    if (patient.past || patient.surgical || patient.medical) {
      if (yPos > 250) {
        doc.addPage();
        addLogoToPage(doc);
        yPos = 60; // Start below logo, similar to first page
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('History:', 14, yPos);
      yPos += 7;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      if (patient.past) {
        const pastLines = doc.splitTextToSize(`Past: ${patient.past}`, 160);
        doc.text(pastLines, 14, yPos);
        yPos += pastLines.length * 5 + 3;
      }
      if (patient.surgical) {
        const surgicalLines = doc.splitTextToSize(`Surgical: ${patient.surgical}`, 160);
        doc.text(surgicalLines, 14, yPos);
        yPos += surgicalLines.length * 5 + 3;
      }
      if (patient.medical) {
        const medicalLines = doc.splitTextToSize(`Medical: ${patient.medical}`, 160);
        doc.text(medicalLines, 14, yPos);
        yPos += medicalLines.length * 5 + 3;
      }
      yPos += 5;
    }

    // Pain Assessment
    if (patient.onset || patient.duration || patient.typeBehaviour || patient.aAndR || patient.intensity) {
      if (yPos > 250) {
        doc.addPage();
        addLogoToPage(doc);
        yPos = 60; // Start below logo, similar to first page
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Pain Assessment:', 14, yPos);
      yPos += 7;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      if (patient.onset) {
        doc.text(`Onset: ${patient.onset}`, 14, yPos);
        yPos += 7;
      }
      if (patient.duration) {
        doc.text(`Duration: ${patient.duration}`, 14, yPos);
        yPos += 7;
      }
      if (patient.typeBehaviour) {
        doc.text(`Type Behaviour: ${patient.typeBehaviour}`, 14, yPos);
        yPos += 7;
      }
      if (patient.aAndR) {
        doc.text(`A and R: ${patient.aAndR}`, 14, yPos);
        yPos += 7;
      }
      if (patient.intensity) {
        doc.text(`Intensity: ${patient.intensity}`, 14, yPos);
        yPos += 7;
      }
      yPos += 5;
    }

    // Observation
    if (patient.bodyBuilt || patient.gait || patient.attitudeOfLimb || patient.posture) {
      if (yPos > 250) {
        doc.addPage();
        addLogoToPage(doc);
        yPos = 60; // Start below logo, similar to first page
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Observation:', 14, yPos);
      yPos += 7;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      if (patient.bodyBuilt) {
        doc.text(`Body Built: ${patient.bodyBuilt}`, 14, yPos);
        yPos += 7;
      }
      if (patient.gait) {
        doc.text(`Gait: ${patient.gait}`, 14, yPos);
        yPos += 7;
      }
      if (patient.attitudeOfLimb) {
        doc.text(`Attitude of Limb: ${patient.attitudeOfLimb}`, 14, yPos);
        yPos += 7;
      }
      if (patient.posture) {
        doc.text(`Posture: ${patient.posture}`, 14, yPos);
        yPos += 7;
      }
      yPos += 5;
    }

    // Local Observation
    if (patient.skinTexture || patient.skinColor || patient.atrophy || patient.swellingDeformity) {
      if (yPos > 250) {
        doc.addPage();
        addLogoToPage(doc);
        yPos = 60; // Start below logo, similar to first page
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Local Observation:', 14, yPos);
      yPos += 7;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      if (patient.skinTexture) {
        doc.text(`Skin Texture: ${patient.skinTexture}`, 14, yPos);
        yPos += 7;
      }
      if (patient.skinColor) {
        doc.text(`Skin Color: ${patient.skinColor}`, 14, yPos);
        yPos += 7;
      }
      if (patient.atrophy) {
        doc.text(`Atrophy: ${patient.atrophy}`, 14, yPos);
        yPos += 7;
      }
      if (patient.swellingDeformity) {
        doc.text(`Swelling Deformity: ${patient.swellingDeformity}`, 14, yPos);
        yPos += 7;
      }
      yPos += 5;
    }

    // Palpation
    if (patient.tenderness || patient.temp || patient.warmth || patient.edema || patient.crepitus || patient.scar || patient.muscleTightness) {
      if (yPos > 250) {
        doc.addPage();
        addLogoToPage(doc);
        yPos = 60; // Start below logo, similar to first page
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Palpation:', 14, yPos);
      yPos += 7;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      if (patient.tenderness) {
        doc.text(`Tenderness: ${patient.tenderness}`, 14, yPos);
        yPos += 7;
      }
      if (patient.temp) {
        doc.text(`Temp: ${patient.temp}`, 14, yPos);
        yPos += 7;
      }
      if (patient.warmth) {
        doc.text(`Warmth: ${patient.warmth}`, 14, yPos);
        yPos += 7;
      }
      if (patient.edema) {
        doc.text(`Edema: ${patient.edema}`, 14, yPos);
        yPos += 7;
      }
      if (patient.crepitus) {
        doc.text(`Crepitus: ${patient.crepitus}`, 14, yPos);
        yPos += 7;
      }
      if (patient.scar) {
        doc.text(`Scar: ${patient.scar}`, 14, yPos);
        yPos += 7;
      }
      if (patient.muscleTightness) {
        doc.text(`Muscle Tightness: ${patient.muscleTightness}`, 14, yPos);
        yPos += 7;
      }
      yPos += 5;
    }

    // Examination
    if (patient.rom || patient.lld || patient.dermatomesAndMyotomes) {
      if (yPos > 250) {
        doc.addPage();
        addLogoToPage(doc);
        yPos = 60; // Start below logo, similar to first page
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Examination:', 14, yPos);
      yPos += 7;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      if (patient.rom) {
        doc.text(`ROM: ${patient.rom}`, 14, yPos);
        yPos += 7;
      }
      if (patient.lld) {
        doc.text(`LLD: ${patient.lld}`, 14, yPos);
        yPos += 7;
      }
      if (patient.dermatomesAndMyotomes) {
        const dmLines = doc.splitTextToSize(`Dermatomes and Myotomes: ${patient.dermatomesAndMyotomes}`, 160);
        doc.text(dmLines, 14, yPos);
        yPos += dmLines.length * 5 + 3;
      }
      yPos += 5;
    }

    // Investigation
    if (patient.investigation) {
      if (yPos > 250) {
        doc.addPage();
        addLogoToPage(doc);
        yPos = 60; // Start below logo, similar to first page
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Investigation:', 14, yPos);
      yPos += 7;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const invLines = doc.splitTextToSize(patient.investigation, 160);
      doc.text(invLines, 14, yPos);
      yPos += invLines.length * 5 + 10;
    }

    // Special Test
    if (patient.specialTest) {
      if (yPos > 250) {
        doc.addPage();
        addLogoToPage(doc);
        yPos = 60; // Start below logo, similar to first page
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Special Test:', 14, yPos);
      yPos += 7;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const stLines = doc.splitTextToSize(patient.specialTest, 160);
      doc.text(stLines, 14, yPos);
      yPos += stLines.length * 5 + 10;
    }

    // Provisional Diagnosis
    if (patient.provisionalDiagnosis) {
      if (yPos > 250) {
        doc.addPage();
        addLogoToPage(doc);
        yPos = 60; // Start below logo, similar to first page
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Provisional Diagnosis:', 14, yPos);
      yPos += 7;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const pdLines = doc.splitTextToSize(patient.provisionalDiagnosis, 160);
      doc.text(pdLines, 14, yPos);
      yPos += pdLines.length * 5 + 10;
    }

    // Diagnosis
    if (patient.diagnosis) {
      if (yPos > 250) {
        doc.addPage();
        addLogoToPage(doc);
        yPos = 60; // Start below logo, similar to first page
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Diagnosis:', 14, yPos);
      yPos += 7;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const diagLines = doc.splitTextToSize(patient.diagnosis, 160);
      doc.text(diagLines, 14, yPos);
      yPos += diagLines.length * 5 + 10;
    }

    // Short Term Treatment
    if (patient.shortTermTreatment) {
      if (yPos > 250) {
        doc.addPage();
        addLogoToPage(doc);
        yPos = 60; // Start below logo, similar to first page
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Short Term Treatment:', 14, yPos);
      yPos += 7;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const sttLines = doc.splitTextToSize(patient.shortTermTreatment, 160);
      doc.text(sttLines, 14, yPos);
      yPos += sttLines.length * 5 + 10;
    }

    // Long Term Treatment
    if (patient.longTermTreatment) {
      if (yPos > 250) {
        doc.addPage();
        addLogoToPage(doc);
        yPos = 60; // Start below logo, similar to first page
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Long Term Treatment:', 14, yPos);
      yPos += 7;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const lttLines = doc.splitTextToSize(patient.longTermTreatment, 160);
      doc.text(lttLines, 14, yPos);
      yPos += lttLines.length * 5 + 10;
    }

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
          addLogoToPage(doc);
          yPos = 60; // Start below logo, similar to first page
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
              addLogoToPage(doc);
              yPos = 60; // Start below logo, similar to first page
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

    // Add footer on all pages
    const pageCount = doc.internal.pages.length - 1; // -1 because pages array includes a blank page at index 0
    const footerText = 'MADE BY AMISHA AND ABHISHEK';
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      // Center the footer text
      const textWidth = doc.getTextWidth(footerText);
      const xPosition = (pageWidth - textWidth) / 2;
      doc.text(footerText, xPosition, pageHeight - 10);
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

