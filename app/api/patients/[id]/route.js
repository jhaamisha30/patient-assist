import { NextResponse } from 'next/server';
import { getCurrentUser, verifyPassword } from '@/lib/auth';
import { getPatientsCollection, getUsersCollection, getDiagnosticsCollection, getDoctorsCollection } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// GET - Get patient details
export async function GET(request, { params }) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const patientsCollection = await getPatientsCollection();
    
    const patient = await patientsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Check authorization
    if (currentUser.role === 'patient' && patient.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (currentUser.role === 'doctor' && patient.doctorId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({ patient });
  } catch (error) {
    console.error('Get patient error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update patient information
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { 
      name, age, password, vitals,
      // Basic details
      gender, address, dateOfAdmission, cc, historyOfPresentIllness, bloodGroup, phone,
      // History
      past, surgical, medical,
      // Pain assessment
      onset, duration, typeBehaviour, aAndR, intensity,
      // Observation
      bodyBuilt, gait, attitudeOfLimb, posture,
      // Local observation
      skinTexture, skinColor, atrophy, swellingDeformity,
      // Palpation
      tenderness, temp, warmth, edema, crepitus, scar, muscleTightness,
      // Examination
      rom, lld, dermatomesAndMyotomes,
      // Investigation, Special test, Diagnosis, Treatment
      investigation, specialTest, provisionalDiagnosis, diagnosis, shortTermTreatment, longTermTreatment
    } = await request.json();

    const patientsCollection = await getPatientsCollection();
    const usersCollection = await getUsersCollection();
    const doctorsCollection = await getDoctorsCollection();

    // Get doctor's doctorId from doctors collection
    const doctor = await doctorsCollection.findOne({ userId: currentUser.id });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor record not found' },
        { status: 404 }
      );
    }

    // Find the patient and verify ownership
    const patient = await patientsCollection.findOne({
      _id: new ObjectId(id),
      doctorId: doctor.doctorId,
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update patient record
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (age !== undefined) updateData.age = parseInt(age);
    // Basic details
    if (gender !== undefined) updateData.gender = gender;
    if (address !== undefined) updateData.address = address;
    if (dateOfAdmission !== undefined) updateData.dateOfAdmission = dateOfAdmission;
    if (cc !== undefined) updateData.cc = cc;
    if (historyOfPresentIllness !== undefined) updateData.historyOfPresentIllness = historyOfPresentIllness;
    if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup;
    if (phone !== undefined) updateData.phone = phone;
    // History
    if (past !== undefined) updateData.past = past;
    if (surgical !== undefined) updateData.surgical = surgical;
    if (medical !== undefined) updateData.medical = medical;
    // Pain assessment
    if (onset !== undefined) updateData.onset = onset;
    if (duration !== undefined) updateData.duration = duration;
    if (typeBehaviour !== undefined) updateData.typeBehaviour = typeBehaviour;
    if (aAndR !== undefined) updateData.aAndR = aAndR;
    if (intensity !== undefined) updateData.intensity = intensity;
    // Observation
    if (bodyBuilt !== undefined) updateData.bodyBuilt = bodyBuilt;
    if (gait !== undefined) updateData.gait = gait;
    if (attitudeOfLimb !== undefined) updateData.attitudeOfLimb = attitudeOfLimb;
    if (posture !== undefined) updateData.posture = posture;
    // Local observation
    if (skinTexture !== undefined) updateData.skinTexture = skinTexture;
    if (skinColor !== undefined) updateData.skinColor = skinColor;
    if (atrophy !== undefined) updateData.atrophy = atrophy;
    if (swellingDeformity !== undefined) updateData.swellingDeformity = swellingDeformity;
    // Palpation
    if (tenderness !== undefined) updateData.tenderness = tenderness;
    if (temp !== undefined) updateData.temp = temp;
    if (warmth !== undefined) updateData.warmth = warmth;
    if (edema !== undefined) updateData.edema = edema;
    if (crepitus !== undefined) updateData.crepitus = crepitus;
    if (scar !== undefined) updateData.scar = scar;
    if (muscleTightness !== undefined) updateData.muscleTightness = muscleTightness;
    // Examination
    if (rom !== undefined) updateData.rom = rom;
    if (lld !== undefined) updateData.lld = lld;
    if (dermatomesAndMyotomes !== undefined) updateData.dermatomesAndMyotomes = dermatomesAndMyotomes;
    // Investigation, Special test, Diagnosis, Treatment
    if (investigation !== undefined) updateData.investigation = investigation;
    if (specialTest !== undefined) updateData.specialTest = specialTest;
    if (provisionalDiagnosis !== undefined) updateData.provisionalDiagnosis = provisionalDiagnosis;
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
    if (shortTermTreatment !== undefined) updateData.shortTermTreatment = shortTermTreatment;
    if (longTermTreatment !== undefined) updateData.longTermTreatment = longTermTreatment;
    // Vitals
    if (vitals !== undefined) {
      updateData.vitals = vitals;
      const hasVitals = Object.values(vitals).some(v => v && v.trim() !== '');
      if (hasVitals) {
        updateData.vitalsLastUpdated = new Date();
      }
    }

    if (Object.keys(updateData).length > 0) {
      await patientsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
    }

    // Update user account if name or password is provided
    if (patient.userId) {
      const userUpdateData = {};
      if (name !== undefined) userUpdateData.name = name;
      if (password !== undefined && password.trim() !== '') {
        const hashedPassword = await hashPassword(password);
        userUpdateData.password = hashedPassword;
      }

      if (Object.keys(userUpdateData).length > 0) {
        await usersCollection.updateOne(
          { _id: new ObjectId(patient.userId) },
          { $set: userUpdateData }
        );
      }
    }

    // Get updated patient
    const updatedPatient = await patientsCollection.findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({
      success: true,
      patient: updatedPatient,
      message: 'Patient updated successfully',
    });
  } catch (error) {
    console.error('Update patient error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a patient
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get password from request body
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to delete a patient' },
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

    const { id } = await params;
    const patientsCollection = await getPatientsCollection();
    const diagnosticsCollection = await getDiagnosticsCollection();
    const doctorsCollection = await getDoctorsCollection();
    
    // Get doctor's doctorId from doctors collection
    const doctor = await doctorsCollection.findOne({ userId: currentUser.id });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor record not found' },
        { status: 404 }
      );
    }
    
    // Find the patient and verify ownership
    const patient = await patientsCollection.findOne({
      _id: new ObjectId(id),
      doctorId: doctor.doctorId,
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete all diagnostic records for this patient
    await diagnosticsCollection.deleteMany({
      patientId: id,
    });

    // Delete the patient record
    await patientsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    // Delete the associated user account
    if (patient.userId) {
      await usersCollection.deleteOne({
        _id: new ObjectId(patient.userId),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Patient deleted successfully',
    });
  } catch (error) {
    console.error('Delete patient error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

