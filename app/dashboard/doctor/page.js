'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { getCurrentUser, getPatients, addPatient, addDiagnostic, getDiagnostics, deletePatient, logout, exportToPDF, exportToExcel, getUnassignedPatients, assignPatient, updateProfilePic, uploadImage, updatePatient, resendVerificationEmail, getCertificates, addCertificate, updateCertificateVisibility, deleteCertificate } from '@/lib/api';

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
  
  // Password modal state for patient deletion
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalCallback, setPasswordModalCallback] = useState(null);
  const [passwordModalTitle, setPasswordModalTitle] = useState('');
  const [passwordModalPatientName, setPasswordModalPatientName] = useState('');
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

  const [patientForm, setPatientForm] = useState({
    name: '',
    age: '',
    email: '',
    password: '',
    bloodGroup: '',
    gender: '',
    phone: '',
    address: '',
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

  const [editPatientForm, setEditPatientForm] = useState({
    name: '',
    age: '',
    password: '',
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
    } catch (err) {
      toast.error('Failed to upload certificate image: ' + (err.message || 'Please check your Cloudinary configuration'));
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
          phone: '',
          address: '',
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

  const openPasswordModal = (title, patientName, callback) => {
    setPasswordModalTitle(title);
    setPasswordModalPatientName(patientName);
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
                    Upload Certificate Image (or use camera) *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCertificateImageChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    disabled={certUploading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    On mobile, you can use the camera directly. Supported formats: JPG, PNG.
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
            <form onSubmit={handleAddPatient} className="p-4 sm:p-6 space-y-4">
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
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Medical History</label>
                <textarea
                  value={patientForm.medicalHistory}
                  onChange={(e) => setPatientForm({ ...patientForm, medicalHistory: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                <textarea
                  value={patientForm.allergies}
                  onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Medications</label>
                <textarea
                  value={patientForm.currentMedications}
                  onChange={(e) => setPatientForm({ ...patientForm, currentMedications: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              
              {/* Vitals Section */}
              <div className="col-span-2 border-t pt-4">
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
            <form onSubmit={handleUpdatePatient} className="p-4 sm:p-6 space-y-4">
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
                <div className="col-span-2">
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
              
              {/* Vitals Section */}
              <div className="border-t pt-4">
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

