import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDiagnosticsCollection, getPatientsCollection, getUsersCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';
import * as XLSX from 'xlsx';

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

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    // Patient Information Sheet
    const patientData = [];
    
    // Add doctor information at the top (for both patients and doctors)
    if (doctor) {
      patientData.push(['Attending Doctor Information']);
      patientData.push(['Doctor Name', `Dr. ${doctor.name}`]);
      patientData.push(['Doctor Email', doctor.email]);
      patientData.push(['']); // Empty row
    }
    
    // Patient Information
    patientData.push(['Patient Information']);
    patientData.push(['Name', patient.name]);
    patientData.push(['Age', patient.age]);
    patientData.push(['Email', patient.email]);
    patientData.push(['Phone', patient.phone || 'N/A']);
    patientData.push(['Address', patient.address || 'N/A']);
    patientData.push(['Gender', patient.gender || 'N/A']);
    patientData.push(['Medical History', patient.medicalHistory || 'N/A']);
    patientData.push(['Allergies', patient.allergies || 'N/A']);
    patientData.push(['Current Medications', patient.currentMedications || 'N/A']);
    
    const patientSheet = XLSX.utils.aoa_to_sheet(patientData);
    XLSX.utils.book_append_sheet(workbook, patientSheet, 'Patient Info');

    // Diagnostic Records Sheet
    const diagnosticData = [
      ['Date', 'Diagnosis', 'Symptoms', 'Treatment', 'Notes'],
      ...diagnostics.map(d => [
        new Date(d.date).toLocaleDateString(),
        d.diagnosis,
        d.symptoms || 'N/A',
        d.treatment || 'N/A',
        d.notes || 'N/A',
      ]),
    ];
    const diagnosticSheet = XLSX.utils.aoa_to_sheet(diagnosticData);
    XLSX.utils.book_append_sheet(workbook, diagnosticSheet, 'Diagnostics');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

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

