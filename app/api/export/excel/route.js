import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDiagnosticsCollection, getPatientsCollection, getUsersCollection, getDoctorsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import ExcelJS from 'exceljs';

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

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();

    // Patient Information Sheet
    const patientSheet = workbook.addWorksheet('Patient Info');
    
    // Patient UHID at the top
    if (patient.uhid) {
      patientSheet.addRow(['Patient UHID', patient.uhid]);
      patientSheet.addRow([]); // Empty row
    }
    
    // Add doctor information at the top (for both patients and doctors)
    if (doctor) {
      patientSheet.addRow(['Attending Doctor Information']);
      patientSheet.addRow(['Doctor Name', `Dr. ${doctor.name}`]);
      patientSheet.addRow(['Doctor Email', doctor.email]);
      if (doctor.uhid) {
        patientSheet.addRow(['Doctor UHID', doctor.uhid]);
      }
      patientSheet.addRow([]); // Empty row
    }
    
    // Patient Information
    patientSheet.addRow(['Patient Information']);
    patientSheet.addRow(['Name', patient.name]);
    patientSheet.addRow(['Age', patient.age]);
    patientSheet.addRow(['Blood Group', patient.bloodGroup || 'Not specified']);
    patientSheet.addRow(['Email', patient.email]);
    patientSheet.addRow(['Phone', patient.phone || 'N/A']);
    patientSheet.addRow(['Address', patient.address || 'N/A']);
    patientSheet.addRow(['Gender', patient.gender || 'N/A']);
    patientSheet.addRow(['Medical History', patient.medicalHistory || 'N/A']);
    patientSheet.addRow(['Allergies', patient.allergies || 'N/A']);
    patientSheet.addRow(['Current Medications', patient.currentMedications || 'N/A']);
    patientSheet.addRow([]); // Empty row
    
    // Vitals Section
    if (patient.vitals) {
      patientSheet.addRow(['Vitals']);
      patientSheet.addRow(['Blood Pressure', patient.vitals.bloodPressure || 'N/A']);
      patientSheet.addRow(['Heart Rate (bpm)', patient.vitals.heartRate || 'N/A']);
      patientSheet.addRow(['Temperature (°F)', patient.vitals.temperature || 'N/A']);
      patientSheet.addRow(['Weight (kg)', patient.vitals.weight || 'N/A']);
      patientSheet.addRow(['Height (cm)', patient.vitals.height || 'N/A']);
      patientSheet.addRow(['Blood Sugar (mg/dL)', patient.vitals.bloodSugar || 'N/A']);
      
      // Last Updated timestamp
      if (patient.vitalsLastUpdated) {
        patientSheet.addRow(['Vitals Last Updated', new Date(patient.vitalsLastUpdated).toLocaleString()]);
      } else {
        patientSheet.addRow(['Vitals Last Updated', 'N/A']);
      }
    }

    // Diagnostic Records Sheet
    const diagnosticSheet = workbook.addWorksheet('Diagnostics');
    
    // Add headers
    diagnosticSheet.addRow(['Date', 'Patient Name', 'Attending Doctor', 'Diagnosis', 'Symptoms', 'Treatment', 'Notes']);
    
    // Style header row
    const headerRow = diagnosticSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF228B22' } // Green color
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add diagnostic data
    diagnostics.forEach(d => {
      diagnosticSheet.addRow([
        new Date(d.date).toLocaleDateString(),
        d.patientName || patient.name,
        d.attendingDoctor || doctor?.name || 'N/A',
        d.diagnosis,
        d.symptoms || 'N/A',
        d.treatment || 'N/A',
        d.notes || 'N/A',
      ]);
    });
    
    // Auto-fit columns for better readability
    diagnosticSheet.columns.forEach(column => {
      column.width = 20;
    });

    // Generate Excel buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="patient-report-${patient.name}-${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

