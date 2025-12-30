'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { getCurrentUser, getPatients, addPatient, addDiagnostic, getDiagnostics, deletePatient, logout, exportToPDF, exportToExcel, getUnassignedPatients, assignPatient, updateProfilePic, uploadImage, updatePatient, resendVerificationEmail, getCertificates, addCertificate, updateCertificateVisibility, deleteCertificate, getLabReports, addLabReport, deleteLabReport } from '@/lib/api';

export default function DoctorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddDiagnostic, setShowAddDiagnostic] = useState(false);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDiagnostics, setPatientDiagnostics] = useState([]);
  const [unassignedPatients, setUnassignedPatients] = useState([]);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [viewingCertificate, setViewingCertificate] = useState(null);
  
  // Password modal state for patient deletion and other operations
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalCallback, setPasswordModalCallback] = useState(null);
  const [passwordModalTitle, setPasswordModalTitle] = useState('');
  const [passwordModalPatientName, setPasswordModalPatientName] = useState('');
  const [passwordModalMessage, setPasswordModalMessage] = useState(null); // Custom message, null = use default patient deletion message
  const [passwordInput, setPasswordInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Certificates
  const [certificates, setCertificates] = useState([]);
  const [certLoading, setCertLoading] = useState(false);
  const [certForm, setCertForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    isPublic: false,
  });
  const [certUploading, setCertUploading] = useState(false);

  // Lab Reports
  const [labReports, setLabReports] = useState([]);
  const [labReportLoading, setLabReportLoading] = useState(false);
  const [showAddLabReport, setShowAddLabReport] = useState(false);
  const [selectedPatientForLabReport, setSelectedPatientForLabReport] = useState(null);
  const [labReportForm, setLabReportForm] = useState({
    patientId: '',
    description: '',
    fileUrl: '',
  });
  const [labReportUploading, setLabReportUploading] = useState(false);
  const [showLabReportPasswordModal, setShowLabReportPasswordModal] = useState(false);
  const [labReportPassword, setLabReportPassword] = useState('');

  const [patientForm, setPatientForm] = useState({
    name: '',
    age: '',
    email: '',
    password: '',
    // Basic details
    gender: '',
    address: '',
    dateOfAdmission: '',
    cc: '',
    historyOfPresentIllness: '',
    bloodGroup: '',
    phone: '',
    // History
    past: '',
    surgical: '',
    medical: '',
    // Pain assessment
    onset: '',
    duration: '',
    typeBehaviour: '',
    aAndR: '',
    intensity: '',
    // Observation
    bodyBuilt: '',
    gait: '',
    attitudeOfLimb: '',
    posture: '',
    // Local observation
    skinTexture: '',
    skinColor: '',
    atrophy: '',
    swellingDeformity: '',
    // Palpation
    tenderness: '',
    temp: '',
    warmth: '',
    edema: '',
    crepitus: '',
    scar: '',
    muscleTightness: '',
    // Examination
    rom: '',
    lld: '',
    dermatomesAndMyotomes: '',
    // Investigation, Special test, Diagnosis, Treatment
    investigation: '',
    specialTest: '',
    provisionalDiagnosis: '',
    diagnosis: '',
    shortTermTreatment: '',
    longTermTreatment: '',
    // Legacy fields
    medicalHistory: '',
    allergies: '',
    currentMedications: '',
    // Vitals
    vitals: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      weight: '',
      height: '',
      bloodSugar: '',
    },
  });

  const [editPatientForm, setEditPatientForm] = useState({
    name: '',
    age: '',
    password: '',
    // Basic details
    gender: '',
    address: '',
    dateOfAdmission: '',
    cc: '',
    historyOfPresentIllness: '',
    bloodGroup: '',
    phone: '',
    // History
    past: '',
    surgical: '',
    medical: '',
    // Pain assessment
    onset: '',
    duration: '',
    typeBehaviour: '',
    aAndR: '',
    intensity: '',
    // Observation
    bodyBuilt: '',
    gait: '',
    attitudeOfLimb: '',
    posture: '',
    // Local observation
    skinTexture: '',
    skinColor: '',
    atrophy: '',
    swellingDeformity: '',
    // Palpation
    tenderness: '',
    temp: '',
    warmth: '',
    edema: '',
    crepitus: '',
    scar: '',
    muscleTightness: '',
    // Examination
    rom: '',
    lld: '',
    dermatomesAndMyotomes: '',
    // Investigation, Special test, Diagnosis, Treatment
    investigation: '',
    specialTest: '',
    provisionalDiagnosis: '',
    diagnosis: '',
    shortTermTreatment: '',
    longTermTreatment: '',
    // Vitals
    vitals: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      weight: '',
      height: '',
      bloodSugar: '',
    },
  });

  const [diagnosticForm, setDiagnosticForm] = useState({
    diagnosis: '',
    symptoms: '',
    treatment: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });

  const loadPatients = async () => {
    try {
      const patientsData = await getPatients();
      setPatients(patientsData.patients || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadUnassignedPatients = async () => {
    try {
      const data = await getUnassignedPatients();
      setUnassignedPatients(data.patients || []);
    } catch (error) {
      console.error('Error loading unassigned patients:', error);
    }
  };

  const loadCertificates = async () => {
    try {
      setCertLoading(true);
      const data = await getCertificates();
      setCertificates(data.certificates || []);
    } catch (error) {
      console.error('Error loading certificates:', error);
    } finally {
      setCertLoading(false);
    }
  };

  const loadLabReports = async (patientId = null) => {
    try {
      setLabReportLoading(true);
      const data = await getLabReports(patientId);
      setLabReports(data.labReports || []);
    } catch (error) {
      console.error('Error loading lab reports:', error);
    } finally {
      setLabReportLoading(false);
    }
  };

  const handleLabReportFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type (PDF or image)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF or image file (JPG/PNG)');
      e.target.value = '';
      return;
    }

    setLabReportUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }
      
      setLabReportForm((prev) => ({
        ...prev,
        fileUrl: result.url,
      }));
      toast.success('Lab report file uploaded successfully!');
      e.target.value = '';
    } catch (err) {
      toast.error('Failed to upload lab report file: ' + (err.message || 'Please check your Cloudinary configuration'));
      e.target.value = '';
    } finally {
      setLabReportUploading(false);
    }
  };

  const handleAddLabReport = async (e) => {
    e.preventDefault();
    if (!labReportForm.patientId || !labReportForm.fileUrl || !labReportPassword) {
      toast.error('Please fill all required fields and enter your password');
      return;
    }

    try {
      const response = await addLabReport(
        labReportForm.patientId,
        labReportForm.fileUrl,
        labReportForm.description,
        labReportPassword
      );
      if (response.success) {
        toast.success('Lab report added successfully!');
        setLabReportForm({
          patientId: '',
          description: '',
          fileUrl: '',
        });
        setLabReportPassword('');
        setShowLabReportPasswordModal(false);
        setShowAddLabReport(false);
        setSelectedPatientForLabReport(null);
        await loadLabReports();
      }
    } catch (error) {
      const errorMessage = error.message || 'An error occurred';
      if (errorMessage.includes('Invalid password') || errorMessage.includes('Password is required')) {
        toast.error(errorMessage);
      } else {
        toast.error('Error adding lab report: ' + errorMessage);
      }
    }
  };

  const handleDeleteLabReport = (report) => {
    const reportId = report.id;
    const reportName = report.patient?.name || 'Lab Report';
    const customMessage = (
      <>
        <p className="text-sm text-gray-700">
          Are you sure you want to delete the lab report for patient <strong>"{reportName}"</strong>?
        </p>
        <p className="text-xs text-gray-600 mt-2">
          This will permanently delete:
        </p>
        <ul className="text-xs text-gray-600 mt-1 ml-4 list-disc">
          <li>Lab report file</li>
          <li>All associated data</li>
        </ul>
        <p className="text-xs text-red-600 mt-2 font-semibold">This action cannot be undone.</p>
      </>
    );
    
    openPasswordModal(
      'Delete Lab Report',
      reportName,
      async (password) => {
        try {
          const response = await deleteLabReport(reportId, password);
          if (response.success) {
            toast.success('Lab report deleted successfully!');
            await loadLabReports();
          }
        } catch (error) {
          const errorMessage = error.message || 'An error occurred';
          if (errorMessage.includes('Invalid password') || errorMessage.includes('Password is required')) {
            toast.error(errorMessage);
          } else {
            toast.error('Error deleting lab report: ' + errorMessage);
          }
          throw error; // Re-throw to keep modal open
        }
      },
      customMessage
    );
  };

  const handleAssignPatient = async (patientId) => {
    try {
      await assignPatient(patientId);
      await loadUnassignedPatients();
      await loadPatients();
      toast.success('Patient assigned successfully!');
    } catch (error) {
      toast.error('Error assigning patient: ' + error.message);
    }
  };

  const handleProfilePicUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await uploadImage(file);
      await updateProfilePic(response.url);
      const updatedUser = await getCurrentUser();
      setUser(updatedUser);
      setShowProfileModal(false);
      toast.success('Profile picture updated successfully!');
    } catch (err) {
      toast.error('Failed to update profile picture: ' + (err.message || 'Please check your Cloudinary configuration'));
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'doctor') {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      
      await loadPatients();
      await loadUnassignedPatients();
      await loadCertificates();
      await loadLabReports();
      setLoading(false);
    }
    loadData();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleCertificateImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCertUploading(true);
    try {
      const response = await uploadImage(file);
      setCertForm((prev) => ({
        ...prev,
        imageUrl: response.url,
      }));
      toast.success('Certificate image uploaded successfully!');
      // Reset the input so the same file can be selected again if needed
      e.target.value = '';
    } catch (err) {
      toast.error('Failed to upload certificate image: ' + (err.message || 'Please check your Cloudinary configuration'));
      // Reset the input on error too
      e.target.value = '';
    } finally {
      setCertUploading(false);
    }
  };

  const handleAddCertificate = async (e) => {
    e.preventDefault();
    if (!certForm.title || !certForm.description || !certForm.imageUrl) {
      toast.error('Please provide title, description, and image for the certificate.');
      return;
    }

    try {
      const response = await addCertificate({
        certificateTitle: certForm.title,
        certificateDescription: certForm.description,
        certificateImage: certForm.imageUrl,
        isPublic: certForm.isPublic,
      });
      if (response.success) {
        toast.success('Certificate added successfully!');
        setCertForm({
          title: '',
          description: '',
          imageUrl: '',
          isPublic: false,
        });
        await loadCertificates();
      }
    } catch (error) {
      toast.error('Error adding certificate: ' + error.message);
    }
  };

  const handleToggleCertificateVisibility = async (certId, isPublic) => {
    try {
      await updateCertificateVisibility(certId, isPublic);
      toast.success(`Certificate marked as ${isPublic ? 'Public' : 'Private'}`);
      await loadCertificates();
    } catch (error) {
      toast.error('Error updating certificate visibility: ' + error.message);
    }
  };

  const handleDeleteCertificate = async (certId) => {
    const confirmed = window.confirm('Are you sure you want to delete this certificate? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const response = await deleteCertificate(certId);
      if (response.success) {
        toast.success('Certificate deleted successfully!');
        await loadCertificates();
      }
    } catch (error) {
      toast.error('Error deleting certificate: ' + error.message);
    }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    try {
      const response = await addPatient(patientForm);
      if (response.success) {
        await loadPatients();
        setShowAddPatient(false);
        setPatientForm({
          name: '',
          age: '',
          email: '',
          password: '',
          gender: '',
          address: '',
          dateOfAdmission: '',
          cc: '',
          historyOfPresentIllness: '',
          bloodGroup: '',
          phone: '',
          past: '',
          surgical: '',
          medical: '',
          onset: '',
          duration: '',
          typeBehaviour: '',
          aAndR: '',
          intensity: '',
          bodyBuilt: '',
          gait: '',
          attitudeOfLimb: '',
          posture: '',
          skinTexture: '',
          skinColor: '',
          atrophy: '',
          swellingDeformity: '',
          tenderness: '',
          temp: '',
          warmth: '',
          edema: '',
          crepitus: '',
          scar: '',
          muscleTightness: '',
          rom: '',
          lld: '',
          dermatomesAndMyotomes: '',
          investigation: '',
          specialTest: '',
          provisionalDiagnosis: '',
          diagnosis: '',
          shortTermTreatment: '',
          longTermTreatment: '',
          medicalHistory: '',
          allergies: '',
          currentMedications: '',
          vitals: {
            bloodPressure: '',
            heartRate: '',
            temperature: '',
            weight: '',
            height: '',
            bloodSugar: '',
          },
        });
        // Show appropriate message based on email status
        if (response.emailSent) {
          toast.success('Patient added successfully! Verification email has been sent.');
        } else if (response.emailError) {
          toast.warning(response.message || `Patient added successfully, but ${response.emailError}.`);
        } else {
          toast.success(response.message || 'Patient added successfully!');
        }
      }
    } catch (error) {
      toast.error('Error adding patient: ' + error.message);
    }
  };

  const handleAddDiagnostic = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      const response = await addDiagnostic({
        ...diagnosticForm,
        patientId: selectedPatient._id || selectedPatient.id,
      });
      if (response.success) {
        setShowAddDiagnostic(false);
        setDiagnosticForm({
          diagnosis: '',
          symptoms: '',
          treatment: '',
          notes: '',
          date: new Date().toISOString().split('T')[0],
        });
        toast.success('Diagnostic record added successfully!');
        if (selectedPatient) {
          loadPatientDiagnostics(selectedPatient);
        }
      }
    } catch (error) {
      toast.error('Error adding diagnostic: ' + error.message);
    }
  };

  const loadPatientDiagnostics = async (patient) => {
    try {
      const diagnostics = await getDiagnostics(patient._id || patient.id);
      setPatientDiagnostics(diagnostics.diagnostics || []);
      setSelectedPatient(patient);
      setShowAddDiagnostic(true);
    } catch (error) {
      console.error('Error loading diagnostics:', error);
    }
  };

  const handleEditPatient = (patient) => {
    setEditPatientForm({
      name: patient.name || '',
      age: patient.age || '',
      password: '',
      // Basic details
      gender: patient.gender || '',
      address: patient.address || '',
      dateOfAdmission: patient.dateOfAdmission || '',
      cc: patient.cc || '',
      historyOfPresentIllness: patient.historyOfPresentIllness || '',
      bloodGroup: patient.bloodGroup || '',
      phone: patient.phone || '',
      // History
      past: patient.past || '',
      surgical: patient.surgical || '',
      medical: patient.medical || '',
      // Pain assessment
      onset: patient.onset || '',
      duration: patient.duration || '',
      typeBehaviour: patient.typeBehaviour || '',
      aAndR: patient.aAndR || '',
      intensity: patient.intensity || '',
      // Observation
      bodyBuilt: patient.bodyBuilt || '',
      gait: patient.gait || '',
      attitudeOfLimb: patient.attitudeOfLimb || '',
      posture: patient.posture || '',
      // Local observation
      skinTexture: patient.skinTexture || '',
      skinColor: patient.skinColor || '',
      atrophy: patient.atrophy || '',
      swellingDeformity: patient.swellingDeformity || '',
      // Palpation
      tenderness: patient.tenderness || '',
      temp: patient.temp || '',
      warmth: patient.warmth || '',
      edema: patient.edema || '',
      crepitus: patient.crepitus || '',
      scar: patient.scar || '',
      muscleTightness: patient.muscleTightness || '',
      // Examination
      rom: patient.rom || '',
      lld: patient.lld || '',
      dermatomesAndMyotomes: patient.dermatomesAndMyotomes || '',
      // Investigation, Special test, Diagnosis, Treatment
      investigation: patient.investigation || '',
      specialTest: patient.specialTest || '',
      provisionalDiagnosis: patient.provisionalDiagnosis || '',
      diagnosis: patient.diagnosis || '',
      shortTermTreatment: patient.shortTermTreatment || '',
      longTermTreatment: patient.longTermTreatment || '',
      // Vitals
      vitals: patient.vitals || {
        bloodPressure: '',
        heartRate: '',
        temperature: '',
        weight: '',
        height: '',
        bloodSugar: '',
      },
    });
    setSelectedPatient(patient);
    setShowEditPatient(true);
  };

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      const patientId = selectedPatient._id || selectedPatient.id;
      const updateData = {
        name: editPatientForm.name,
        age: editPatientForm.age,
        // Basic details
        gender: editPatientForm.gender,
        address: editPatientForm.address,
        dateOfAdmission: editPatientForm.dateOfAdmission,
        cc: editPatientForm.cc,
        historyOfPresentIllness: editPatientForm.historyOfPresentIllness,
        bloodGroup: editPatientForm.bloodGroup,
        phone: editPatientForm.phone,
        // History
        past: editPatientForm.past,
        surgical: editPatientForm.surgical,
        medical: editPatientForm.medical,
        // Pain assessment
        onset: editPatientForm.onset,
        duration: editPatientForm.duration,
        typeBehaviour: editPatientForm.typeBehaviour,
        aAndR: editPatientForm.aAndR,
        intensity: editPatientForm.intensity,
        // Observation
        bodyBuilt: editPatientForm.bodyBuilt,
        gait: editPatientForm.gait,
        attitudeOfLimb: editPatientForm.attitudeOfLimb,
        posture: editPatientForm.posture,
        // Local observation
        skinTexture: editPatientForm.skinTexture,
        skinColor: editPatientForm.skinColor,
        atrophy: editPatientForm.atrophy,
        swellingDeformity: editPatientForm.swellingDeformity,
        // Palpation
        tenderness: editPatientForm.tenderness,
        temp: editPatientForm.temp,
        warmth: editPatientForm.warmth,
        edema: editPatientForm.edema,
        crepitus: editPatientForm.crepitus,
        scar: editPatientForm.scar,
        muscleTightness: editPatientForm.muscleTightness,
        // Examination
        rom: editPatientForm.rom,
        lld: editPatientForm.lld,
        dermatomesAndMyotomes: editPatientForm.dermatomesAndMyotomes,
        // Investigation, Special test, Diagnosis, Treatment
        investigation: editPatientForm.investigation,
        specialTest: editPatientForm.specialTest,
        provisionalDiagnosis: editPatientForm.provisionalDiagnosis,
        diagnosis: editPatientForm.diagnosis,
        shortTermTreatment: editPatientForm.shortTermTreatment,
        longTermTreatment: editPatientForm.longTermTreatment,
        // Vitals
        vitals: editPatientForm.vitals,
      };

      // Only include password if it's not empty
      if (editPatientForm.password.trim() !== '') {
        updateData.password = editPatientForm.password;
      }

      const response = await updatePatient(patientId, updateData);
      if (response.success) {
        toast.success('Patient updated successfully!');
        setShowEditPatient(false);
        setSelectedPatient(null);
        await loadPatients();
      }
    } catch (error) {
      toast.error('Error updating patient: ' + error.message);
    }
  };

  const openPasswordModal = (title, patientName, callback, customMessage = null) => {
    setPasswordModalTitle(title);
    setPasswordModalPatientName(patientName);
    setPasswordModalMessage(customMessage);
    setPasswordModalCallback(() => callback);
    setShowPasswordModal(true);
    setPasswordInput('');
  };

  const handlePasswordConfirm = async () => {
    if (!passwordInput) {
      toast.error('Please enter your password');
      return;
    }

    setDeleting(true);
    try {
      if (passwordModalCallback) {
        await passwordModalCallback(passwordInput);
        // Only show success and close modal if callback succeeds
        setShowPasswordModal(false);
        setPasswordInput('');
        setPasswordModalCallback(null);
        setPasswordModalPatientName('');
        setPasswordModalMessage(null);
      }
    } catch (error) {
      // Don't close modal on error, let user try again
      const errorMessage = error.message || 'An error occurred';
      if (errorMessage.includes('Invalid password') || errorMessage.includes('Password is required')) {
        // Expected error - only show toast
        toast.error(errorMessage);
      } else {
        // Unexpected error - show toast and log to console
        console.error('Delete error:', error);
        toast.error('Error: ' + errorMessage);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePatient = (patient) => {
    const patientId = patient._id || patient.id;
    const patientName = patient.name;
    
    openPasswordModal(
      'Delete Patient',
      patientName,
      async (password) => {
        const response = await deletePatient(patientId, password);
      if (response.success) {
        toast.success('Patient deleted successfully!');
        await loadPatients(); // Refresh the list
      }
    }
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img 
                src="/patientAssistLogoSVGWithWhiteBG.svg" 
                alt="Patient Assist Logo" 
                className="h-12 sm:h-16 md:h-20 w-auto"
              />
              <h1 className="text-xl sm:text-2xl font-bold text-green-600">Patient Assist</h1>
              <span className="text-sm sm:text-base text-gray-500 hidden sm:inline">Doctor Dashboard</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              {user?.profilePic && (
                <img 
                  src={user.profilePic} 
                  alt="Profile" 
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover cursor-pointer"
                  onClick={() => setShowProfileModal(true)}
                />
              )}
              {!user?.profilePic && (
                <div 
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center cursor-pointer"
                  onClick={() => setShowProfileModal(true)}
                >
                  <span className="text-lg font-semibold text-green-600">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 sm:flex-none min-w-0">
                <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{user?.name}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
              <Link
                href="/dashboard/team"
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm sm:text-base whitespace-nowrap"
              >
                Our Team
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm sm:text-base whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Email Verification Banner */}
      {user && !user.verified && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-yellow-700">
                  <strong>Account not verified:</strong> Please verify your email address to access all features. Check your inbox for the verification email.
                </p>
              </div>
              <button
                onClick={async () => {
                  setResendingVerification(true);
                  try {
                    await resendVerificationEmail();
                    toast.success('Verification email sent! Please check your inbox.');
                  } catch (err) {
                    toast.error(err.message || 'Failed to resend verification email');
                  } finally {
                    setResendingVerification(false);
                  }
                }}
                disabled={resendingVerification}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {resendingVerification ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Patient Button and Refresh */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={() => setShowAddPatient(true)}
            className="px-4 py-2.5 sm:px-6 sm:py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
          >
            + Add New Patient
          </button>
          <button
            onClick={() => {
              setShowUnassigned(!showUnassigned);
              if (!showUnassigned) {
                loadUnassignedPatients();
              }
            }}
            className="px-4 py-2.5 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
          >
            {showUnassigned ? 'Hide' : 'Show'} Unassigned Patients ({unassignedPatients.length})
          </button>
          <button
            onClick={loadPatients}
            className="px-4 py-2.5 sm:px-6 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors text-sm sm:text-base"
          >
            🔄 Refresh List
          </button>
        </div>

        {/* Unassigned Patients Section */}
        {showUnassigned && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Unassigned Patients</h2>
            </div>
            <div className="overflow-x-auto">
              {unassignedPatients.length === 0 ? (
                <div className="px-4 sm:px-6 py-8 text-center text-gray-500">
                  No unassigned patients.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {unassignedPatients.map((patient) => (
                      <tr key={patient.id || patient._id} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.name}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.email}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleAssignPatient(patient.id || patient._id)}
                            className="text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 text-xs sm:text-sm"
                          >
                            Assign to Me
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Patients List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">My Patients</h2>
          </div>
          
          {/* Mobile Card View */}
          <div className="block sm:hidden divide-y divide-gray-200">
            {patients.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                No patients added yet. Click "Add New Patient" to get started.
              </div>
            ) : (
              patients.map((patient) => (
                <div key={patient._id || patient.id} className="p-4">
                  <div className="mb-3">
                    <h3 className="text-base font-semibold text-gray-900">{patient.name}</h3>
                    <p className="text-sm text-gray-500">Age: {patient.age}</p>
                    <p className="text-sm text-gray-500 truncate">{patient.email}</p>
                    {patient.phone && <p className="text-sm text-gray-500">Phone: {patient.phone}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => loadPatientDiagnostics(patient)}
                      className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 border border-green-200"
                    >
                      Add Diagnostic
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPatientForLabReport(patient);
                        setLabReportForm({ ...labReportForm, patientId: patient._id || patient.id });
                        setShowAddLabReport(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 border border-blue-200"
                    >
                      Add Lab Report
                    </button>
                    <button
                      onClick={() => exportToPDF(patient._id || patient.id)}
                      className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 border border-green-200"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => exportToExcel(patient._id || patient.id)}
                      className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 border border-green-200"
                    >
                      Excel
                    </button>
                    <button
                      onClick={() => handleDeletePatient(patient)}
                      className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 border border-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Phone</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No patients added yet. Click "Add New Patient" to get started.
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr key={patient._id || patient.id} className="hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.name}</td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.age}</td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.email}</td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{patient.phone || 'N/A'}</td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleEditPatient(patient)}
                            className="text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 text-xs sm:text-sm"
                          >
                            Edit Details
                          </button>
                          <button
                            onClick={() => loadPatientDiagnostics(patient)}
                            className="text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 text-xs sm:text-sm"
                          >
                            Add Diagnostic
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPatientForLabReport(patient);
                              setLabReportForm({ ...labReportForm, patientId: patient._id || patient.id });
                              setShowAddLabReport(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 text-xs sm:text-sm"
                          >
                            Add Lab Report
                          </button>
                          <button
                            onClick={() => exportToPDF(patient._id || patient.id)}
                            className="text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 text-xs sm:text-sm"
                          >
                            Export PDF
                          </button>
                          <button
                            onClick={() => exportToExcel(patient._id || patient.id)}
                            className="text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 text-xs sm:text-sm"
                          >
                            Export Excel
                          </button>
                          <button
                            onClick={() => handleDeletePatient(patient)}
                            className="text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 text-xs sm:text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Certificates Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">My Certificates</h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload professional certificates and choose whether they are visible to patients.
              </p>
            </div>
          </div>

          {/* Add Certificate Form */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <form onSubmit={handleAddCertificate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Title *</label>
                  <input
                    type="text"
                    value={certForm.title}
                    onChange={(e) => setCertForm({ ...certForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="e.g., MBBS, MD Internal Medicine"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                  <div className="flex items-center space-x-4 mt-1">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="certVisibility"
                        checked={!certForm.isPublic}
                        onChange={() => setCertForm({ ...certForm, isPublic: false })}
                        className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">Private</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="certVisibility"
                        checked={certForm.isPublic}
                        onChange={() => setCertForm({ ...certForm, isPublic: true })}
                        className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">Public</span>
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Description *</label>
                <textarea
                  value={certForm.description}
                  onChange={(e) => setCertForm({ ...certForm, description: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Describe the certificate (institution, specialization, year, etc.)"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Certificate Image *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCertificateImageChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    disabled={certUploading}
                    id="certificate-file-input"
                    style={{ display: 'none' }}
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('certificate-file-input');
                        if (input) {
                          // Remove capture attribute to allow gallery selection
                          input.removeAttribute('capture');
                          input.click();
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                      disabled={certUploading}
                    >
                      📁 Choose from Gallery
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('certificate-file-input');
                        if (input) {
                          // Add capture attribute to open camera
                          input.setAttribute('capture', 'environment');
                          input.click();
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors text-sm font-medium"
                      disabled={certUploading}
                    >
                      📷 Take Photo
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Choose from gallery or take a new photo. Supported formats: JPG, PNG.
                  </p>
                  {certUploading && <p className="mt-2 text-sm text-gray-500">Uploading certificate image...</p>}
                </div>
                {certForm.imageUrl && (
                  <div className="flex flex-col items-start space-y-2">
                    <p className="text-sm font-medium text-gray-700">Preview</p>
                    <img
                      src={certForm.imageUrl}
                      alt="Certificate preview"
                      className="w-full max-w-xs border border-gray-200 rounded-lg object-contain bg-gray-50"
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setCertForm({
                      title: '',
                      description: '',
                      imageUrl: '',
                      isPublic: false,
                    })
                  }
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors w-full sm:w-auto"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={certUploading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {certUploading ? 'Uploading...' : 'Add Certificate'}
                </button>
              </div>
            </form>
          </div>

          {/* Certificates List */}
          <div className="px-4 sm:px-6 py-4">
            {certLoading ? (
              <p className="text-sm text-gray-500">Loading certificates...</p>
            ) : certificates.length === 0 ? (
              <p className="text-sm text-gray-500">No certificates added yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="border border-gray-200 rounded-lg overflow-hidden bg-white flex flex-col"
                  >
                    {cert.certificateImage && (
                      <img
                        src={cert.certificateImage}
                        alt={cert.certificateTitle}
                        className="w-full h-40 object-cover bg-gray-50 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setViewingCertificate(cert)}
                      />
                    )}
                    <div className="p-3 sm:p-4 flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {cert.certificateTitle}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            cert.isPublic
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {cert.isPublic ? 'Public' : 'Private'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3 line-clamp-3">
                        {cert.certificateDescription}
                      </p>
                      <div className="mt-auto flex items-center justify-between space-x-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center space-x-1 cursor-pointer text-xs">
                            <input
                              type="radio"
                              name={`visibility-${cert.id}`}
                              checked={!cert.isPublic}
                              onChange={() => handleToggleCertificateVisibility(cert.id, false)}
                              className="w-3 h-3 text-green-600 border-gray-300 focus:ring-green-500"
                            />
                            <span className="text-gray-700">Private</span>
                          </label>
                          <label className="flex items-center space-x-1 cursor-pointer text-xs">
                            <input
                              type="radio"
                              name={`visibility-${cert.id}`}
                              checked={cert.isPublic}
                              onChange={() => handleToggleCertificateVisibility(cert.id, true)}
                              className="w-3 h-3 text-green-600 border-gray-300 focus:ring-green-500"
                            />
                            <span className="text-gray-700">Public</span>
                          </label>
                        </div>
                        <button
                          onClick={() => handleDeleteCertificate(cert.id)}
                          className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lab Reports Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Lab Reports</h2>
              <p className="text-sm text-gray-500 mt-1">
                View and manage lab reports for your patients.
              </p>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4">
            {labReportLoading ? (
              <p className="text-sm text-gray-500">Loading lab reports...</p>
            ) : labReports.length === 0 ? (
              <p className="text-sm text-gray-500">No lab reports found.</p>
            ) : (
              <div className="space-y-4">
                {labReports.map((report) => (
                  <div
                    key={report.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-semibold text-gray-900">
                            Patient: {report.patient?.name || 'Unknown'}
                          </h3>
                          {report.patient?.uhid && (
                            <span className="text-xs text-gray-500">(UHID: {report.patient.uhid})</span>
                          )}
                        </div>
                        {report.description && (
                          <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span>
                            Date: {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                          {report.doctor?.uhid && (
                            <span>Doctor UHID: {report.doctor.uhid}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`/api/lab-reports/download?id=${report.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          View
                        </a>
                        <a
                          href={`/api/lab-reports/download?id=${report.id}`}
                          download
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          Download
                        </a>
                        <button
                          onClick={() => handleDeleteLabReport(report)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Add New Patient</h3>
              <button
                onClick={() => setShowAddPatient(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddPatient} className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Authentication Details */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Authentication Details <span className="text-red-500">*</span></h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                      type="email"
                    required
                      value={patientForm.email}
                      onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                      type="password"
                    required
                      value={patientForm.password}
                      onChange={(e) => setPatientForm({ ...patientForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                </div>
              </div>

              {/* Basic Details */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Basic Details</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                        type="text"
                    required
                        value={patientForm.name}
                        onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                  <input
                        type="number"
                    required
                        value={patientForm.age}
                        onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                  <select
                        required
                    value={patientForm.gender}
                    onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group *</label>
                      <select
                        required
                        value={patientForm.bloodGroup}
                        onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      >
                        <option value="">Select blood group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Admission</label>
                      <input
                        type="date"
                        value={patientForm.dateOfAdmission}
                        onChange={(e) => setPatientForm({ ...patientForm, dateOfAdmission: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      />
                    </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={patientForm.address}
                  onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CC (Chief Complaint)</label>
                <textarea
                      value={patientForm.cc}
                      onChange={(e) => setPatientForm({ ...patientForm, cc: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">History of Present Illness</label>
                <textarea
                      value={patientForm.historyOfPresentIllness}
                      onChange={(e) => setPatientForm({ ...patientForm, historyOfPresentIllness: e.target.value })}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* History */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">History</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Past</label>
                    <textarea
                      value={patientForm.past}
                      onChange={(e) => setPatientForm({ ...patientForm, past: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Surgical</label>
                <textarea
                      value={patientForm.surgical}
                      onChange={(e) => setPatientForm({ ...patientForm, surgical: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical</label>
                    <textarea
                      value={patientForm.medical}
                      onChange={(e) => setPatientForm({ ...patientForm, medical: e.target.value })}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>
              
              {/* Pain Assessment */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Pain Assessment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Onset</label>
                    <input
                      type="text"
                      value={patientForm.onset}
                      onChange={(e) => setPatientForm({ ...patientForm, onset: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <input
                      type="text"
                      value={patientForm.duration}
                      onChange={(e) => setPatientForm({ ...patientForm, duration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type Behaviour</label>
                    <input
                      type="text"
                      value={patientForm.typeBehaviour}
                      onChange={(e) => setPatientForm({ ...patientForm, typeBehaviour: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">A and R</label>
                    <input
                      type="text"
                      value={patientForm.aAndR}
                      onChange={(e) => setPatientForm({ ...patientForm, aAndR: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intensity</label>
                    <input
                      type="text"
                      value={patientForm.intensity}
                      onChange={(e) => setPatientForm({ ...patientForm, intensity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Observation */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Observation</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body Built</label>
                    <input
                      type="text"
                      value={patientForm.bodyBuilt}
                      onChange={(e) => setPatientForm({ ...patientForm, bodyBuilt: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gait</label>
                    <input
                      type="text"
                      value={patientForm.gait}
                      onChange={(e) => setPatientForm({ ...patientForm, gait: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attitude of Limb</label>
                    <input
                      type="text"
                      value={patientForm.attitudeOfLimb}
                      onChange={(e) => setPatientForm({ ...patientForm, attitudeOfLimb: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Posture</label>
                    <input
                      type="text"
                      value={patientForm.posture}
                      onChange={(e) => setPatientForm({ ...patientForm, posture: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Local Observation */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Local Observation</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skin Texture</label>
                    <input
                      type="text"
                      value={patientForm.skinTexture}
                      onChange={(e) => setPatientForm({ ...patientForm, skinTexture: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skin Color</label>
                    <input
                      type="text"
                      value={patientForm.skinColor}
                      onChange={(e) => setPatientForm({ ...patientForm, skinColor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Atrophy</label>
                    <input
                      type="text"
                      value={patientForm.atrophy}
                      onChange={(e) => setPatientForm({ ...patientForm, atrophy: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Swelling Deformity</label>
                    <input
                      type="text"
                      value={patientForm.swellingDeformity}
                      onChange={(e) => setPatientForm({ ...patientForm, swellingDeformity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Palpation */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Palpation</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tenderness</label>
                    <input
                      type="text"
                      value={patientForm.tenderness}
                      onChange={(e) => setPatientForm({ ...patientForm, tenderness: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temp</label>
                    <input
                      type="text"
                      value={patientForm.temp}
                      onChange={(e) => setPatientForm({ ...patientForm, temp: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warmth</label>
                    <input
                      type="text"
                      value={patientForm.warmth}
                      onChange={(e) => setPatientForm({ ...patientForm, warmth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Edema</label>
                    <input
                      type="text"
                      value={patientForm.edema}
                      onChange={(e) => setPatientForm({ ...patientForm, edema: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Crepitus</label>
                    <input
                      type="text"
                      value={patientForm.crepitus}
                      onChange={(e) => setPatientForm({ ...patientForm, crepitus: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scar</label>
                    <input
                      type="text"
                      value={patientForm.scar}
                      onChange={(e) => setPatientForm({ ...patientForm, scar: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Muscle Tightness</label>
                    <input
                      type="text"
                      value={patientForm.muscleTightness}
                      onChange={(e) => setPatientForm({ ...patientForm, muscleTightness: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Examination */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Examination</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ROM</label>
                    <input
                      type="text"
                      value={patientForm.rom}
                      onChange={(e) => setPatientForm({ ...patientForm, rom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LLD</label>
                    <input
                      type="text"
                      value={patientForm.lld}
                      onChange={(e) => setPatientForm({ ...patientForm, lld: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dermatomes and Myotomes</label>
                    <textarea
                      value={patientForm.dermatomesAndMyotomes}
                      onChange={(e) => setPatientForm({ ...patientForm, dermatomesAndMyotomes: e.target.value })}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Investigation */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Investigation</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Investigation</label>
                  <textarea
                    value={patientForm.investigation}
                    onChange={(e) => setPatientForm({ ...patientForm, investigation: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Special Test */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Special Test</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Test</label>
                  <textarea
                    value={patientForm.specialTest}
                    onChange={(e) => setPatientForm({ ...patientForm, specialTest: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Provisional Diagnosis */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Provisional Diagnosis</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provisional Diagnosis</label>
                  <textarea
                    value={patientForm.provisionalDiagnosis}
                    onChange={(e) => setPatientForm({ ...patientForm, provisionalDiagnosis: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Diagnosis */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Diagnosis</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                  <textarea
                    value={patientForm.diagnosis}
                    onChange={(e) => setPatientForm({ ...patientForm, diagnosis: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Short Term Treatment */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Short Term Treatment</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Term Treatment</label>
                  <textarea
                    value={patientForm.shortTermTreatment}
                    onChange={(e) => setPatientForm({ ...patientForm, shortTermTreatment: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Long Term Treatment */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Long Term Treatment</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Long Term Treatment</label>
                  <textarea
                    value={patientForm.longTermTreatment}
                    onChange={(e) => setPatientForm({ ...patientForm, longTermTreatment: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Vitals */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Vitals</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure</label>
                    <input
                      type="text"
                      value={patientForm.vitals.bloodPressure}
                      onChange={(e) => setPatientForm({ 
                        ...patientForm, 
                        vitals: { ...patientForm.vitals, bloodPressure: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="e.g., 120/80"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heart Rate (bpm)</label>
                    <input
                      type="text"
                      value={patientForm.vitals.heartRate}
                      onChange={(e) => setPatientForm({ 
                        ...patientForm, 
                        vitals: { ...patientForm.vitals, heartRate: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="e.g., 72"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°F)</label>
                    <input
                      type="text"
                      value={patientForm.vitals.temperature}
                      onChange={(e) => setPatientForm({ 
                        ...patientForm, 
                        vitals: { ...patientForm.vitals, temperature: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="e.g., 98.6"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input
                      type="text"
                      value={patientForm.vitals.weight}
                      onChange={(e) => setPatientForm({ 
                        ...patientForm, 
                        vitals: { ...patientForm.vitals, weight: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="e.g., 70"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                    <input
                      type="text"
                      value={patientForm.vitals.height}
                      onChange={(e) => setPatientForm({ 
                        ...patientForm, 
                        vitals: { ...patientForm.vitals, height: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="e.g., 170"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Sugar (mg/dL)</label>
                    <input
                      type="text"
                      value={patientForm.vitals.bloodSugar}
                      onChange={(e) => setPatientForm({ 
                        ...patientForm, 
                        vitals: { ...patientForm.vitals, bloodSugar: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddPatient(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors w-full sm:w-auto"
                >
                  Add Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Diagnostic Modal */}
      {showAddDiagnostic && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                <span className="hidden sm:inline">Add Diagnostic Record - </span>{selectedPatient.name}
              </h3>
              <button
                onClick={() => {
                  setShowAddDiagnostic(false);
                  setSelectedPatient(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            
            {/* Existing Diagnostics */}
            {patientDiagnostics.length > 0 && (
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Previous Diagnostic Records</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {patientDiagnostics.map((diagnostic) => (
                    <div key={diagnostic._id || diagnostic.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="text-xs text-gray-500">
                            {new Date(diagnostic.date).toLocaleDateString()}
                          </p>
                          <h5 className="text-sm font-semibold text-gray-900 mt-1">
                            {diagnostic.diagnosis}
                          </h5>
                          {diagnostic.patientName && (
                            <p className="text-xs text-gray-600 mt-1">
                              Patient: <span className="font-medium">{diagnostic.patientName}</span>
                            </p>
                          )}
                          {diagnostic.attendingDoctor && (
                            <p className="text-xs text-gray-600 mt-1">
                              Doctor: <span className="font-medium">{diagnostic.attendingDoctor}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      {diagnostic.symptoms && (
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">Symptoms:</span> {diagnostic.symptoms}
                        </p>
                      )}
                      {diagnostic.treatment && (
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">Treatment:</span> {diagnostic.treatment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <form onSubmit={handleAddDiagnostic} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={diagnosticForm.date}
                  onChange={(e) => setDiagnosticForm({ ...diagnosticForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis *</label>
                <input
                  type="text"
                  required
                  value={diagnosticForm.diagnosis}
                  onChange={(e) => setDiagnosticForm({ ...diagnosticForm, diagnosis: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Enter diagnosis"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms</label>
                <textarea
                  value={diagnosticForm.symptoms}
                  onChange={(e) => setDiagnosticForm({ ...diagnosticForm, symptoms: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Enter symptoms"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Treatment</label>
                <textarea
                  value={diagnosticForm.treatment}
                  onChange={(e) => setDiagnosticForm({ ...diagnosticForm, treatment: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Enter treatment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={diagnosticForm.notes}
                  onChange={(e) => setDiagnosticForm({ ...diagnosticForm, notes: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Additional notes"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDiagnostic(false);
                    setSelectedPatient(null);
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors w-full sm:w-auto"
                >
                  Add Diagnostic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {showEditPatient && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                Edit Patient Details - {selectedPatient.name}
              </h3>
              <button
                onClick={() => {
                  setShowEditPatient(false);
                  setSelectedPatient(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdatePatient} className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Basic Details */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Basic Details</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        required
                        value={editPatientForm.name}
                        onChange={(e) => setEditPatientForm({ ...editPatientForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                      <input
                        type="number"
                        required
                        value={editPatientForm.age}
                        onChange={(e) => setEditPatientForm({ ...editPatientForm, age: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                      <select
                        required
                        value={editPatientForm.gender}
                        onChange={(e) => setEditPatientForm({ ...editPatientForm, gender: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group *</label>
                      <select
                        required
                        value={editPatientForm.bloodGroup}
                        onChange={(e) => setEditPatientForm({ ...editPatientForm, bloodGroup: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      >
                        <option value="">Select blood group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={editPatientForm.phone}
                        onChange={(e) => setEditPatientForm({ ...editPatientForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Admission</label>
                      <input
                        type="date"
                        value={editPatientForm.dateOfAdmission}
                        onChange={(e) => setEditPatientForm({ ...editPatientForm, dateOfAdmission: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={editPatientForm.address}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, address: e.target.value })}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CC (Chief Complaint)</label>
                    <textarea
                      value={editPatientForm.cc}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, cc: e.target.value })}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">History of Present Illness</label>
                    <textarea
                      value={editPatientForm.historyOfPresentIllness}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, historyOfPresentIllness: e.target.value })}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password (Leave blank to keep current)</label>
                    <input
                      type="password"
                      value={editPatientForm.password}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="Enter new password (optional)"
                    />
                  </div>
                </div>
              </div>

              {/* History */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">History</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Past</label>
                    <textarea
                      value={editPatientForm.past}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, past: e.target.value })}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Surgical</label>
                    <textarea
                      value={editPatientForm.surgical}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, surgical: e.target.value })}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical</label>
                    <textarea
                      value={editPatientForm.medical}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, medical: e.target.value })}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Pain Assessment */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Pain Assessment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Onset</label>
                    <input
                      type="text"
                      value={editPatientForm.onset}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, onset: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <input
                      type="text"
                      value={editPatientForm.duration}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, duration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type Behaviour</label>
                    <input
                      type="text"
                      value={editPatientForm.typeBehaviour}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, typeBehaviour: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">A and R</label>
                    <input
                      type="text"
                      value={editPatientForm.aAndR}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, aAndR: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intensity</label>
                    <input
                      type="text"
                      value={editPatientForm.intensity}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, intensity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Observation */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Observation</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body Built</label>
                    <input
                      type="text"
                      value={editPatientForm.bodyBuilt}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, bodyBuilt: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gait</label>
                    <input
                      type="text"
                      value={editPatientForm.gait}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, gait: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attitude of Limb</label>
                    <input
                      type="text"
                      value={editPatientForm.attitudeOfLimb}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, attitudeOfLimb: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Posture</label>
                    <input
                      type="text"
                      value={editPatientForm.posture}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, posture: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Local Observation */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Local Observation</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skin Texture</label>
                    <input
                      type="text"
                      value={editPatientForm.skinTexture}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, skinTexture: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skin Color</label>
                    <input
                      type="text"
                      value={editPatientForm.skinColor}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, skinColor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Atrophy</label>
                    <input
                      type="text"
                      value={editPatientForm.atrophy}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, atrophy: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Swelling Deformity</label>
                    <input
                      type="text"
                      value={editPatientForm.swellingDeformity}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, swellingDeformity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Palpation */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Palpation</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tenderness</label>
                    <input
                      type="text"
                      value={editPatientForm.tenderness}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, tenderness: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temp</label>
                    <input
                      type="text"
                      value={editPatientForm.temp}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, temp: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warmth</label>
                    <input
                      type="text"
                      value={editPatientForm.warmth}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, warmth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Edema</label>
                    <input
                      type="text"
                      value={editPatientForm.edema}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, edema: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Crepitus</label>
                    <input
                      type="text"
                      value={editPatientForm.crepitus}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, crepitus: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scar</label>
                    <input
                      type="text"
                      value={editPatientForm.scar}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, scar: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Muscle Tightness</label>
                    <input
                      type="text"
                      value={editPatientForm.muscleTightness}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, muscleTightness: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Examination */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Examination</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ROM</label>
                    <input
                      type="text"
                      value={editPatientForm.rom}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, rom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LLD</label>
                    <input
                      type="text"
                      value={editPatientForm.lld}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, lld: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dermatomes and Myotomes</label>
                    <textarea
                      value={editPatientForm.dermatomesAndMyotomes}
                      onChange={(e) => setEditPatientForm({ ...editPatientForm, dermatomesAndMyotomes: e.target.value })}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Investigation */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Investigation</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Investigation</label>
                  <textarea
                    value={editPatientForm.investigation}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, investigation: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Special Test */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Special Test</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Test</label>
                  <textarea
                    value={editPatientForm.specialTest}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, specialTest: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Provisional Diagnosis */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Provisional Diagnosis</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provisional Diagnosis</label>
                  <textarea
                    value={editPatientForm.provisionalDiagnosis}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, provisionalDiagnosis: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Diagnosis */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Diagnosis</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                  <textarea
                    value={editPatientForm.diagnosis}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, diagnosis: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Short Term Treatment */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Short Term Treatment</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Term Treatment</label>
                  <textarea
                    value={editPatientForm.shortTermTreatment}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, shortTermTreatment: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Long Term Treatment */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Long Term Treatment</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Long Term Treatment</label>
                  <textarea
                    value={editPatientForm.longTermTreatment}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, longTermTreatment: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Vitals */}
              <div className="border-b pb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Vitals</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Pressure</label>
                    <input
                      type="text"
                      value={editPatientForm.vitals.bloodPressure}
                      onChange={(e) => setEditPatientForm({ 
                        ...editPatientForm, 
                        vitals: { ...editPatientForm.vitals, bloodPressure: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="e.g., 120/80"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heart Rate (bpm)</label>
                    <input
                      type="text"
                      value={editPatientForm.vitals.heartRate}
                      onChange={(e) => setEditPatientForm({ 
                        ...editPatientForm, 
                        vitals: { ...editPatientForm.vitals, heartRate: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="e.g., 72"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°F)</label>
                    <input
                      type="text"
                      value={editPatientForm.vitals.temperature}
                      onChange={(e) => setEditPatientForm({ 
                        ...editPatientForm, 
                        vitals: { ...editPatientForm.vitals, temperature: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="e.g., 98.6"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input
                      type="text"
                      value={editPatientForm.vitals.weight}
                      onChange={(e) => setEditPatientForm({ 
                        ...editPatientForm, 
                        vitals: { ...editPatientForm.vitals, weight: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="e.g., 70"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                    <input
                      type="text"
                      value={editPatientForm.vitals.height}
                      onChange={(e) => setEditPatientForm({ 
                        ...editPatientForm, 
                        vitals: { ...editPatientForm.vitals, height: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="e.g., 170"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Sugar (mg/dL)</label>
                    <input
                      type="text"
                      value={editPatientForm.vitals.bloodSugar}
                      onChange={(e) => setEditPatientForm({ 
                        ...editPatientForm, 
                        vitals: { ...editPatientForm.vitals, bloodSugar: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditPatient(false);
                    setSelectedPatient(null);
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors w-full sm:w-auto"
                >
                  Update Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lab Report Modal */}
      {showAddLabReport && selectedPatientForLabReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                Add Lab Report - {selectedPatientForLabReport.name}
              </h3>
              <button
                onClick={() => {
                  setShowAddLabReport(false);
                  setSelectedPatientForLabReport(null);
                  setLabReportForm({ patientId: '', description: '', fileUrl: '' });
                  setLabReportPassword('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddLabReport} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={labReportForm.description}
                  onChange={(e) => setLabReportForm({ ...labReportForm, description: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Enter description or notes about the lab report"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Lab Report File (PDF or Image) *
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/jpg,image/png"
                  onChange={handleLabReportFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  disabled={labReportUploading}
                  id="lab-report-file-input"
                  style={{ display: 'none' }}
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('lab-report-file-input');
                      if (input) {
                        // Remove capture attribute to allow gallery selection
                        input.removeAttribute('capture');
                        input.click();
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                    disabled={labReportUploading}
                  >
                    📁 Choose from Gallery
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('lab-report-file-input');
                      if (input) {
                        // Add capture attribute to open camera
                        input.setAttribute('capture', 'environment');
                        input.click();
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors text-sm font-medium"
                    disabled={labReportUploading}
                  >
                    📷 Take Photo
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Choose from gallery or take a new photo. Supported formats: PDF, JPG, PNG
                </p>
                {labReportUploading && <p className="mt-2 text-sm text-gray-500">Uploading file...</p>}
                {labReportForm.fileUrl && (
                  <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-green-700">✓ File uploaded successfully</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter Your Password *</label>
                <input
                  type="password"
                  value={labReportPassword}
                  onChange={(e) => setLabReportPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Enter your password to confirm"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Password required to add lab report
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddLabReport(false);
                    setSelectedPatientForLabReport(null);
                    setLabReportForm({ patientId: '', description: '', fileUrl: '' });
                    setLabReportPassword('');
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={labReportUploading || !labReportForm.fileUrl}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {labReportUploading ? 'Uploading...' : 'Add Lab Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate View Modal */}
      {viewingCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {viewingCertificate.certificateTitle}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {viewingCertificate.certificateDescription}
                </p>
              </div>
              <button
                onClick={() => setViewingCertificate(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center">
              {viewingCertificate.certificateImage && (
                <img
                  src={viewingCertificate.certificateImage}
                  alt={viewingCertificate.certificateTitle}
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Picture Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Update Profile Picture</h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicUpdate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  disabled={uploading}
                />
                {uploading && <p className="mt-2 text-sm text-gray-500">Uploading...</p>}
              </div>
              {user?.profilePic && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Current Picture:</p>
                  <img src={user.profilePic} alt="Profile" className="w-32 h-32 rounded-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{passwordModalTitle}</h3>
              <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                    setPasswordModalCallback(null);
                    setPasswordModalPatientName('');
                    setPasswordModalMessage(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  disabled={deleting}
                >
                  ✕
                </button>
            </div>
            <div className="space-y-4">
              {passwordModalPatientName && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  {passwordModalMessage ? (
                    passwordModalMessage
                  ) : (
                    <>
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold text-red-700">Warning:</span> You are about to delete patient <span className="font-semibold">"{passwordModalPatientName}"</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-2">
                        This will permanently delete:
                      </p>
                      <ul className="text-xs text-gray-600 mt-1 ml-4 list-disc">
                        <li>Patient record</li>
                        <li>All diagnostic records</li>
                        <li>Patient user account</li>
                      </ul>
                      <p className="text-xs text-red-600 mt-2 font-semibold">This action cannot be undone.</p>
                    </>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !deleting && passwordInput) {
                      handlePasswordConfirm();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Password"
                  disabled={deleting}
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                    setPasswordModalCallback(null);
                    setPasswordModalPatientName('');
                    setPasswordModalMessage(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordConfirm}
                  disabled={deleting || !passwordInput}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

