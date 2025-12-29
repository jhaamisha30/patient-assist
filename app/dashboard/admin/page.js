'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { getCurrentUser, getAdminData, deleteDoctor, deletePatientAdmin, deleteDiagnostic, logout, updateProfilePic, uploadImage, resendVerificationEmail, getAdminCertificates, deleteAdminCertificate } from '@/lib/api';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('doctors');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedDoctors, setExpandedDoctors] = useState(new Set());
  const [expandedPatients, setExpandedPatients] = useState(new Set());
  const [resendingVerification, setResendingVerification] = useState(false);
  
  // Filter states
  const [doctorFilterUnauthenticated, setDoctorFilterUnauthenticated] = useState(false);
  const [patientFilterUnauthenticated, setPatientFilterUnauthenticated] = useState(false);
  const [patientFilterUnassigned, setPatientFilterUnassigned] = useState(false);
  
  // Selection states
  const [selectedDoctors, setSelectedDoctors] = useState(new Set());
  const [selectedPatients, setSelectedPatients] = useState(new Set());
  
  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalCallback, setPasswordModalCallback] = useState(null);
  const [passwordModalTitle, setPasswordModalTitle] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Certificates tab state
  const [certDoctorFilter, setCertDoctorFilter] = useState('');
  const [viewingCertificate, setViewingCertificate] = useState(null);

  useEffect(() => {
    async function loadData() {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      await loadAllData();
      setLoading(false);
    }
    loadData();
  }, [router]);

  const loadAllData = async () => {
    try {
      const data = await getAdminData();
      setDoctors(data.doctors || []);
      setPatients(data.patients || []);
      setDiagnostics(data.diagnostics || []);
      setCertificates(data.certificates || []);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Open password modal for deletion
  const openPasswordModal = (title, callback) => {
    setPasswordModalTitle(title);
    setPasswordModalCallback(() => callback);
    setShowPasswordModal(true);
    setPasswordInput('');
  };

  // Handle password confirmation and deletion
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
      }
    } catch (error) {
      // Don't close modal on error, let user try again
      // Suppress console error for expected authentication errors
      const errorMessage = error.message || 'An error occurred';
      if (errorMessage.includes('Invalid password') || errorMessage.includes('Password is required')) {
        // Expected error - only show toast, don't log to console
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

  const handleDeleteDoctor = async (doctorId, password) => {
    await deleteDoctor(doctorId, password);
      await loadAllData();
    setSelectedDoctors(new Set());
      toast.success('Doctor deleted successfully!');
  };

  const handleDeletePatient = async (patientId, password) => {
    await deletePatientAdmin(patientId, password);
    await loadAllData();
    setSelectedPatients(new Set());
    toast.success('Patient deleted successfully!');
  };

  // Admin delete certificate with password
  const handleDeleteCertificateAdmin = (certId, password) => {
    openPasswordModal('Delete Certificate', async (enteredPassword) => {
      const finalPassword = password || enteredPassword;
      const response = await deleteAdminCertificate(certId, finalPassword);
      if (response && response.success) {
        toast.success('Certificate deleted successfully!');
        await loadAllData();
      }
    });
  };

  const handleDeleteDoctorWithPassword = (doctorId) => {
    openPasswordModal(
      'Delete Doctor',
      async (password) => {
        await handleDeleteDoctor(doctorId, password);
      }
    );
  };

  const handleDeletePatientWithPassword = (patientId) => {
    openPasswordModal(
      'Delete Patient',
      async (password) => {
        await handleDeletePatient(patientId, password);
      }
    );
  };

  // Bulk delete handlers
  const handleBulkDeleteDoctors = () => {
    if (selectedDoctors.size === 0) {
      toast.error('Please select doctors to delete');
      return;
    }
    const count = selectedDoctors.size;
    const doctorIds = Array.from(selectedDoctors);
    openPasswordModal(
      `Delete ${count} Doctor(s)`,
      async (password) => {
        let successCount = 0;
        let errorCount = 0;
        
        const deletePromises = doctorIds.map(id => 
          deleteDoctor(id, password)
            .then(() => {
              successCount++;
              return true;
            })
            .catch(err => {
              console.error(`Error deleting doctor ${id}:`, err);
              errorCount++;
              return false;
            })
        );
        
        await Promise.all(deletePromises);
      await loadAllData();
        setSelectedDoctors(new Set());
        
        if (errorCount > 0) {
          toast.warning(`${successCount} doctor(s) deleted, ${errorCount} failed. Please check your password.`);
        } else {
          toast.success(`${successCount} doctor(s) deleted successfully!`);
        }
      }
    );
  };

  const handleBulkDeletePatients = () => {
    if (selectedPatients.size === 0) {
      toast.error('Please select patients to delete');
      return;
    }
    const count = selectedPatients.size;
    const patientIds = Array.from(selectedPatients);
    openPasswordModal(
      `Delete ${count} Patient(s)`,
      async (password) => {
        let successCount = 0;
        let errorCount = 0;
        
        const deletePromises = patientIds.map(id => 
          deletePatientAdmin(id, password)
            .then(() => {
              successCount++;
              return true;
            })
            .catch(err => {
              console.error(`Error deleting patient ${id}:`, err);
              errorCount++;
              return false;
            })
        );
        
        await Promise.all(deletePromises);
        await loadAllData();
        setSelectedPatients(new Set());
        
        if (errorCount > 0) {
          toast.warning(`${successCount} patient(s) deleted, ${errorCount} failed. Please check your password.`);
        } else {
          toast.success(`${successCount} patient(s) deleted successfully!`);
        }
      }
    );
  };

  // Toggle selection
  const toggleDoctorSelection = (doctorId) => {
    const newSelected = new Set(selectedDoctors);
    if (newSelected.has(doctorId)) {
      newSelected.delete(doctorId);
    } else {
      newSelected.add(doctorId);
    }
    setSelectedDoctors(newSelected);
  };

  const togglePatientSelection = (patientId) => {
    const newSelected = new Set(selectedPatients);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedPatients(newSelected);
  };

  // Select all / deselect all
  const toggleSelectAllDoctors = () => {
    const filteredDoctors = getFilteredDoctors();
    if (selectedDoctors.size === filteredDoctors.length) {
      setSelectedDoctors(new Set());
    } else {
      setSelectedDoctors(new Set(filteredDoctors.map(d => d.id)));
    }
  };

  const toggleSelectAllPatients = () => {
    const filteredPatients = getFilteredPatients();
    if (selectedPatients.size === filteredPatients.length) {
      setSelectedPatients(new Set());
    } else {
      setSelectedPatients(new Set(filteredPatients.map(p => p.id)));
    }
  };

  // Filter functions
  const getFilteredDoctors = () => {
    let filtered = doctors;
    if (doctorFilterUnauthenticated) {
      filtered = filtered.filter(d => !d.verified);
    }
    return filtered;
  };

  const getFilteredPatients = () => {
    let filtered = patients;
    if (patientFilterUnauthenticated) {
      filtered = filtered.filter(p => !p.verified);
    }
    if (patientFilterUnassigned) {
      filtered = filtered.filter(p => !p.doctorId || p.doctorId === null || p.doctorId === '');
    }
    return filtered;
  };

  const handleDeleteDiagnostic = async (diagnosticId) => {
    if (!window.confirm('Are you sure you want to delete this diagnostic record?')) {
      return;
    }
    try {
      await deleteDiagnostic(diagnosticId);
      await loadAllData();
      toast.success('Diagnostic deleted successfully!');
    } catch (error) {
      toast.error('Error deleting diagnostic: ' + error.message);
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
              <span className="text-sm sm:text-base text-gray-500 hidden sm:inline">Admin Dashboard</span>
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
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 overflow-x-auto">
          <nav className="flex space-x-4 sm:space-x-8 min-w-max">
            <button
              onClick={() => setActiveTab('doctors')}
              className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'doctors'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Doctors ({doctors.length})
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'patients'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Patients ({patients.length})
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'diagnostics'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Diagnostics ({diagnostics.length})
            </button>
            <button
              onClick={() => setActiveTab('tree')}
              className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'tree'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tree View
            </button>
            <button
              onClick={() => setActiveTab('certificates')}
              className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'certificates'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Certificates ({certificates.length})
            </button>
          </nav>
        </div>

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (() => {
          const filteredDoctors = getFilteredDoctors();
          return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">All Doctors ({filteredDoctors.length})</h2>
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Filter */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={doctorFilterUnauthenticated}
                        onChange={(e) => {
                          setDoctorFilterUnauthenticated(e.target.checked);
                          setSelectedDoctors(new Set()); // Clear selection when filter changes
                        }}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">Unauthenticated</span>
                    </label>
                    {/* Bulk Delete Button */}
                    {selectedDoctors.size > 0 && (
                      <button
                        onClick={handleBulkDeleteDoctors}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        Delete Selected ({selectedDoctors.size})
                      </button>
                    )}
                  </div>
                </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={filteredDoctors.length > 0 && selectedDoctors.size === filteredDoctors.length}
                          onChange={toggleSelectAllDoctors}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                      </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDoctors.length === 0 ? (
                    <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        No doctors found.
                      </td>
                    </tr>
                  ) : (
                      filteredDoctors.map((doctor) => (
                      <tr key={doctor.id} className="hover:bg-gray-50">
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedDoctors.has(doctor.id)}
                              onChange={() => toggleDoctorSelection(doctor.id)}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                          </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doctor.name}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doctor.email}</td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            {doctor.verified ? (
                              <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">Verified</span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">Unverified</span>
                            )}
                          </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                              onClick={() => handleDeleteDoctorWithPassword(doctor.id)}
                            className="text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 text-xs sm:text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}

        {/* Patients Tab */}
        {activeTab === 'patients' && (() => {
          const filteredPatients = getFilteredPatients();
          return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">All Patients ({filteredPatients.length})</h2>
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Filters */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={patientFilterUnauthenticated}
                        onChange={(e) => {
                          setPatientFilterUnauthenticated(e.target.checked);
                          setSelectedPatients(new Set()); // Clear selection when filter changes
                        }}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">Unauthenticated</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={patientFilterUnassigned}
                        onChange={(e) => {
                          setPatientFilterUnassigned(e.target.checked);
                          setSelectedPatients(new Set()); // Clear selection when filter changes
                        }}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">Unassigned</span>
                    </label>
                    {/* Bulk Delete Button */}
                    {selectedPatients.size > 0 && (
                      <button
                        onClick={handleBulkDeletePatients}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        Delete Selected ({selectedPatients.size})
                      </button>
                    )}
                  </div>
                </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={filteredPatients.length > 0 && selectedPatients.size === filteredPatients.length}
                          onChange={toggleSelectAllPatients}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                      </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Group</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPatients.length === 0 ? (
                    <tr>
                        <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                        No patients found.
                      </td>
                    </tr>
                  ) : (
                      filteredPatients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-gray-50">
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedPatients.has(patient.id)}
                              onChange={() => togglePatientSelection(patient.id)}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                          </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.name}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.age}</td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{patient.bloodGroup || 'Not specified'}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.email}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.currentDoctor || 'Unassigned'}</td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            {patient.verified ? (
                              <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">Verified</span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">Unverified</span>
                            )}
                          </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                              onClick={() => handleDeletePatientWithPassword(patient.id)}
                            className="text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 text-xs sm:text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}

        {/* Tree View Tab */}
        {activeTab === 'tree' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Hierarchical View</h2>
              <p className="text-sm text-gray-500 mt-1">Click to expand/collapse doctors and patients</p>
            </div>
            <div className="p-4 sm:p-6">
              {/* Unassigned Patients Section */}
              {(() => {
                const unassignedPatients = patients.filter(p => !p.doctorId || p.doctorId === null);
                if (unassignedPatients.length > 0) {
                  return (
                    <div className="mb-6 border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between gap-2 p-3 bg-orange-50">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <span className="text-lg flex-shrink-0">⚠️</span>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 truncate">Unassigned Patients</h3>
                            <p className="text-xs text-gray-600 truncate">Patients without an attending doctor</p>
                          </div>
                        </div>
                        <span className="text-xs bg-orange-200 text-orange-800 px-1.5 sm:px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                          {unassignedPatients.length} {unassignedPatients.length === 1 ? 'patient' : 'patients'}
                        </span>
                      </div>
                      <div className="pl-6 pr-3 py-2 bg-gray-50">
                        <div className="space-y-2">
                          {unassignedPatients.map((patient) => {
                            const patientDiagnostics = diagnostics.filter(d => d.patientId === patient.id);
                            const isPatientExpanded = expandedPatients.has(patient.id);

                            return (
                              <div key={patient.id} className="border border-gray-300 rounded-lg bg-white">
                                <div
                                  className="flex items-center justify-between gap-2 p-2 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                                  onClick={() => {
                                    const newExpanded = new Set(expandedPatients);
                                    if (newExpanded.has(patient.id)) {
                                      newExpanded.delete(patient.id);
                                    } else {
                                      newExpanded.add(patient.id);
                                    }
                                    setExpandedPatients(newExpanded);
                                  }}
                                >
                                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                                    <span className="text-sm flex-shrink-0">
                                      {isPatientExpanded ? '▼' : '▶'}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-medium text-gray-900 text-sm truncate">{patient.name}</h4>
                                      <p className="text-xs text-gray-600 truncate">{patient.email}</p>
                                      <p className="text-xs text-gray-500 mt-0.5">Blood Group: <span className="font-medium">{patient.bloodGroup || 'Not specified'}</span></p>
                                    </div>
                                  </div>
                                  <span className="text-xs bg-blue-200 text-blue-800 px-1.5 sm:px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                                    {patientDiagnostics.length} {patientDiagnostics.length === 1 ? 'diag' : 'diags'}
                                  </span>
                                </div>

                                {isPatientExpanded && (
                                  <div className="pl-6 pr-2 py-2 bg-white">
                                    {patientDiagnostics.length === 0 ? (
                                      <div className="text-xs text-gray-500 py-1">No diagnostic records</div>
                                    ) : (
                                      <div className="space-y-1">
                                        {patientDiagnostics.map((diagnostic) => (
                                          <div
                                            key={diagnostic.id}
                                            className="p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200"
                                          >
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                <p className="text-xs font-medium text-gray-900">
                                                  {diagnostic.diagnosis}
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1">
                                                  {new Date(diagnostic.date).toLocaleDateString()}
                                                </p>
                                                {diagnostic.symptoms && (
                                                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                                    Symptoms: {diagnostic.symptoms}
                                                  </p>
                                                )}
                                              </div>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteDiagnostic(diagnostic.id);
                                                }}
                                                className="ml-2 text-red-600 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
                                              >
                                                Delete
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {doctors.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No doctors found.</div>
              ) : (
                <div className="space-y-2">
                  {doctors.map((doctor) => {
                    const doctorPatients = patients.filter(p => p.doctorId === doctor.id);
                    const doctorCertificates = certificates.filter(c => c.certificateOfDoctor === doctor.id);
                    const isDoctorExpanded = expandedDoctors.has(doctor.id);

                    return (
                      <div key={doctor.id} className="border border-gray-200 rounded-lg">
                        {/* Doctor Node */}
                        <div
                          className="flex items-center justify-between gap-2 p-3 bg-green-50 hover:bg-green-100 cursor-pointer transition-colors"
                          onClick={() => {
                            const newExpanded = new Set(expandedDoctors);
                            if (newExpanded.has(doctor.id)) {
                              newExpanded.delete(doctor.id);
                            } else {
                              newExpanded.add(doctor.id);
                            }
                            setExpandedDoctors(newExpanded);
                          }}
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <span className="text-lg flex-shrink-0">
                              {isDoctorExpanded ? '▼' : '▶'}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-gray-900 truncate">Dr. {doctor.name}</h3>
                              <p className="text-xs text-gray-600 truncate">{doctor.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                            <span className="text-xs bg-green-200 text-green-800 px-1.5 sm:px-2 py-1 rounded-full whitespace-nowrap">
                            {doctorPatients.length} {doctorPatients.length === 1 ? 'patient' : 'patients'}
                          </span>
                            <span className="text-xs bg-blue-200 text-blue-800 px-1.5 sm:px-2 py-1 rounded-full whitespace-nowrap">
                              {doctorCertificates.length} {doctorCertificates.length === 1 ? 'cert' : 'certs'}
                            </span>
                          </div>
                        </div>

                        {/* Patients and Certificates under Doctor */}
                        {isDoctorExpanded && (
                          <div className="pl-6 pr-3 py-2 bg-gray-50 space-y-3">
                            {/* Certificates under Doctor */}
                            <div className="border border-blue-200 rounded-lg bg-white">
                              <div className="flex items-center justify-between gap-2 p-2 bg-blue-50">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                  <span className="text-sm font-semibold text-gray-900">Certificates</span>
                                </div>
                                <span className="text-xs bg-blue-200 text-blue-800 px-1.5 sm:px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                                  {doctorCertificates.length} {doctorCertificates.length === 1 ? 'cert' : 'certs'}
                                </span>
                              </div>
                              <div className="pl-4 pr-3 py-2">
                                {doctorCertificates.length === 0 ? (
                                  <div className="text-xs text-gray-500 py-1">No certificates</div>
                                ) : (
                                  <div className="space-y-1">
                                    {doctorCertificates.map((cert) => (
                                      <div
                                        key={cert.id}
                                        className="p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 flex items-start justify-between"
                                      >
                                        <div className="flex-1 pr-2">
                                          <p className="text-xs font-medium text-gray-900 line-clamp-1">
                                            {cert.certificateTitle}
                                          </p>
                                          <p className="text-[11px] text-gray-600 line-clamp-2">
                                            {cert.certificateDescription}
                                          </p>
                                          <p className="mt-1 text-[10px] text-gray-400">
                                            {cert.isPublic ? 'Public' : 'Private'}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Patients under Doctor */}
                            <div className="space-y-2">
                            {doctorPatients.length === 0 ? (
                              <div className="text-sm text-gray-500 py-2">No patients assigned</div>
                            ) : (
                                doctorPatients.map((patient) => {
                                  const patientDiagnostics = diagnostics.filter(d => d.patientId === patient.id);
                                  const isPatientExpanded = expandedPatients.has(patient.id);

                                  return (
                                    <div key={patient.id} className="border border-gray-300 rounded-lg bg-white">
                                      {/* Patient Node */}
                                      <div
                                        className="flex items-center justify-between gap-2 p-2 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                                        onClick={() => {
                                          const newExpanded = new Set(expandedPatients);
                                          if (newExpanded.has(patient.id)) {
                                            newExpanded.delete(patient.id);
                                          } else {
                                            newExpanded.add(patient.id);
                                          }
                                          setExpandedPatients(newExpanded);
                                        }}
                                      >
                                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                                          <span className="text-sm flex-shrink-0">
                                            {isPatientExpanded ? '▼' : '▶'}
                                          </span>
                                          <div className="min-w-0 flex-1">
                                            <h4 className="font-medium text-gray-900 text-sm truncate">{patient.name}</h4>
                                            <p className="text-xs text-gray-600 truncate">{patient.email}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Blood Group: <span className="font-medium">{patient.bloodGroup || 'Not specified'}</span></p>
                                          </div>
                                        </div>
                                        <span className="text-xs bg-blue-200 text-blue-800 px-1.5 sm:px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                                          {patientDiagnostics.length} {patientDiagnostics.length === 1 ? 'diag' : 'diags'}
                                        </span>
                                      </div>

                                      {/* Diagnostics under Patient */}
                                      {isPatientExpanded && (
                                        <div className="pl-6 pr-2 py-2 bg-white">
                                          {patientDiagnostics.length === 0 ? (
                                            <div className="text-xs text-gray-500 py-1">No diagnostic records</div>
                                          ) : (
                                            <div className="space-y-1">
                                              {patientDiagnostics.map((diagnostic) => (
                                                <div
                                                  key={diagnostic.id}
                                                  className="p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200"
                                                >
                                                  <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                      <p className="text-xs font-medium text-gray-900">
                                                        {diagnostic.diagnosis}
                                                      </p>
                                                      <p className="text-xs text-gray-600 mt-1">
                                                        {new Date(diagnostic.date).toLocaleDateString()}
                                                      </p>
                                                      {diagnostic.symptoms && (
                                                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                                          Symptoms: {diagnostic.symptoms}
                                                        </p>
                                                      )}
                                                    </div>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteDiagnostic(diagnostic.id);
                                                      }}
                                                      className="ml-2 text-red-600 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
                                                    >
                                                      Delete
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                            )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Diagnostics Tab */}
        {activeTab === 'diagnostics' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">All Diagnostics</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {diagnostics.length === 0 ? (
                <div className="px-4 sm:px-6 py-8 text-center text-gray-500">
                  No diagnostic records found.
                </div>
              ) : (
                diagnostics.map((diagnostic) => (
                  <div key={diagnostic.id} className="px-4 sm:px-6 py-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm text-gray-500">
                          {new Date(diagnostic.date).toLocaleDateString()}
                        </p>
                        <h3 className="text-lg font-semibold text-gray-900 mt-1">
                          {diagnostic.diagnosis}
                        </h3>
                        {diagnostic.patientName && (
                          <p className="text-sm text-gray-600 mt-1">
                            Patient: <span className="font-medium">{diagnostic.patientName}</span>
                          </p>
                        )}
                        {diagnostic.attendingDoctor && (
                          <p className="text-sm text-gray-600 mt-1">
                            Attending Doctor: <span className="font-medium">{diagnostic.attendingDoctor}</span>
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteDiagnostic(diagnostic.id)}
                        className="text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 text-xs sm:text-sm"
                      >
                        Delete
                      </button>
                    </div>
                    {diagnostic.symptoms && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">Symptoms:</p>
                        <p className="text-sm text-gray-600">{diagnostic.symptoms}</p>
                      </div>
                    )}
                    {diagnostic.treatment && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">Treatment:</p>
                        <p className="text-sm text-gray-600">{diagnostic.treatment}</p>
                      </div>
                    )}
                    {diagnostic.notes && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">Notes:</p>
                        <p className="text-sm text-gray-600">{diagnostic.notes}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">All Certificates</h2>
                <p className="text-sm text-gray-500 mt-1">
                  View and manage certificates uploaded by doctors. You can filter by doctor and delete certificates.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <label className="text-sm text-gray-700">Filter by Doctor:</label>
                <select
                  value={certDoctorFilter}
                  onChange={(e) => setCertDoctorFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                >
                  <option value="">All Doctors</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} ({doctor.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-4">
              {(() => {
                const filteredCerts = certificates.filter((cert) =>
                  certDoctorFilter ? cert.certificateOfDoctor === certDoctorFilter : true
                );

                if (filteredCerts.length === 0) {
                  return <p className="text-sm text-gray-500">No certificates found.</p>;
                }

                return (
                  <>
                    {/* Mobile Card View */}
                    <div className="block md:hidden space-y-4">
                      {filteredCerts.map((cert) => {
                        const doctorInfo = doctors.find((d) => d.id === cert.certificateOfDoctor);
                        return (
                          <div
                            key={cert.id}
                            className="border border-gray-200 rounded-lg bg-white p-4 space-y-3 overflow-hidden"
                          >
                            {/* Doctor Info */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Doctor
                              </p>
                              {doctorInfo ? (
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 break-words">
                                    Dr. {doctorInfo.name}
                                  </p>
                                  <p className="text-xs text-gray-500 break-words">
                                    {doctorInfo.email}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">Unknown</p>
                              )}
                            </div>

                            {/* Title */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Title
                              </p>
                              <button
                                onClick={() => setViewingCertificate(cert)}
                                className="text-sm font-semibold text-green-600 hover:text-green-700 hover:underline break-words text-left"
                              >
                                {cert.certificateTitle}
                              </button>
                            </div>

                            {/* Description */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Description
                              </p>
                              <p className="text-sm text-gray-700 line-clamp-3 break-words">
                                {cert.certificateDescription}
                              </p>
                            </div>

                            {/* Visibility and Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                  Visibility
                                </p>
                                {cert.isPublic ? (
                                  <span className="inline-block px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                                    Public
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">
                                    Private
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() =>
                                  openPasswordModal('Delete Certificate', async (password) => {
                                    await deleteAdminCertificate(cert.id, password);
                                    toast.success('Certificate deleted successfully!');
                                    await loadAllData();
                                  })
                                }
                                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Doctor
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Title
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Visibility
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredCerts.map((cert) => {
                            const doctorInfo = doctors.find((d) => d.id === cert.certificateOfDoctor);
                            return (
                              <tr key={cert.id} className="hover:bg-gray-50">
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {doctorInfo ? (
                                    <>
                                      <span className="font-medium">Dr. {doctorInfo.name}</span>
                                      <span className="block text-xs text-gray-500">
                                        {doctorInfo.email}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-500">Unknown</span>
                                  )}
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <button
                                    onClick={() => setViewingCertificate(cert)}
                                    className="text-green-600 hover:text-green-700 hover:underline cursor-pointer"
                                  >
                                    {cert.certificateTitle}
                                  </button>
                                </td>
                                <td className="px-4 lg:px-6 py-4 text-sm text-gray-500 max-w-xs">
                                  <p className="line-clamp-2">{cert.certificateDescription}</p>
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                                  {cert.isPublic ? (
                                    <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                                      Public
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">
                                      Private
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() =>
                                      openPasswordModal('Delete Certificate', async (password) => {
                                        await deleteAdminCertificate(cert.id, password);
                                        toast.success('Certificate deleted successfully!');
                                        await loadAllData();
                                      })
                                    }
                                    className="text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 text-xs sm:text-sm"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

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
                {viewingCertificate.doctor && (
                  <p className="text-xs text-gray-400 mt-1">
                    Doctor: Dr. {viewingCertificate.doctor.name} ({viewingCertificate.doctor.email})
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {viewingCertificate.isPublic ? (
                    <span className="text-green-600">Public</span>
                  ) : (
                    <span className="text-gray-600">Private</span>
                  )}
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
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
                disabled={deleting}
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
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

