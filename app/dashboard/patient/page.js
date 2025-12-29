'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { getCurrentUser, getDiagnostics, getMyPatientRecord, logout, exportToPDF, exportToExcel, updateProfilePic, uploadImage, resendVerificationEmail, getCertificates } from '@/lib/api';

export default function PatientDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [doctorCertificates, setDoctorCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [viewingCertificate, setViewingCertificate] = useState(null);

  useEffect(() => {
    async function loadData() {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'patient') {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      
      try {
        // Get patient record and doctor info
        const patientData = await getMyPatientRecord();
        setPatient(patientData.patient);
        setDoctor(patientData.doctor);

        // Get diagnostics
        const diagnosticsData = await getDiagnostics();
        setDiagnostics(diagnosticsData.diagnostics || []);

        // Get doctor's public certificates
        try {
          const certData = await getCertificates();
          setDoctorCertificates(certData.certificates || []);
        } catch (certError) {
          console.error('Error loading doctor certificates:', certError);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
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
              <span className="text-sm sm:text-base text-gray-500 hidden sm:inline">Patient Dashboard</span>
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
        {/* Doctor Information */}
        {doctor && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">My Doctor</h2>
            </div>
            <div className="px-4 sm:px-6 py-4">
              <div className="flex items-center space-x-4">
                {doctor.profilePic && (
                  <img 
                    src={doctor.profilePic} 
                    alt={doctor.name} 
                    className="w-16 h-16 rounded-full object-cover border-2 border-green-200"
                  />
                )}
                {!doctor.profilePic && (
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-200">
                    <span className="text-2xl font-semibold text-green-600">
                      {doctor.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold text-gray-900">{doctor.name}</p>
                  <p className="text-sm text-gray-500">{doctor.email}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Doctor Certificates (Public) */}
        {doctorCertificates && doctorCertificates.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Doctor Certificates</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Certificates your doctor has chosen to share publicly.
                </p>
              </div>
            </div>
            <div className="px-4 sm:px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {doctorCertificates.map((cert) => (
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
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                        {cert.certificateTitle}
                      </h3>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-3">
                        {cert.certificateDescription}
                      </p>
                      <p className="mt-auto text-[11px] text-gray-400">
                        Added by Dr. {doctor?.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Patient Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">My Information</h2>
          </div>
          <div className="px-4 sm:px-6 py-4">
            {patient ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-lg font-medium text-gray-900">{patient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Age</p>
                  <p className="text-lg font-medium text-gray-900">{patient.age}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Blood Group</p>
                  <p className="text-lg font-medium text-gray-900">{patient.bloodGroup || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-lg font-medium text-gray-900">{patient.email}</p>
                </div>
                {patient.phone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-lg font-medium text-gray-900">{patient.phone}</p>
                  </div>
                )}
                {patient.gender && (
                  <div>
                    <p className="text-sm text-gray-500">Gender</p>
                    <p className="text-lg font-medium text-gray-900">{patient.gender}</p>
                  </div>
                )}
                {patient.address && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-lg font-medium text-gray-900">{patient.address}</p>
                  </div>
                )}
                {patient.medicalHistory && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Medical History</p>
                    <p className="text-lg font-medium text-gray-900">{patient.medicalHistory}</p>
                  </div>
                )}
                {patient.allergies && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Allergies</p>
                    <p className="text-lg font-medium text-gray-900">{patient.allergies}</p>
                  </div>
                )}
                {patient.currentMedications && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Current Medications</p>
                    <p className="text-lg font-medium text-gray-900">{patient.currentMedications}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Patient information not available</p>
            )}
          </div>
        </div>

        {/* Vitals Section */}
        {patient && patient.vitals && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Vitals</h2>
              {patient.vitalsLastUpdated && (
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {new Date(patient.vitalsLastUpdated).toLocaleString()}
                </p>
              )}
            </div>
            <div className="px-4 sm:px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {patient.vitals.bloodPressure && (
                  <div>
                    <p className="text-sm text-gray-500">Blood Pressure</p>
                    <p className="text-lg font-medium text-gray-900">{patient.vitals.bloodPressure}</p>
                  </div>
                )}
                {patient.vitals.heartRate && (
                  <div>
                    <p className="text-sm text-gray-500">Heart Rate (bpm)</p>
                    <p className="text-lg font-medium text-gray-900">{patient.vitals.heartRate}</p>
                  </div>
                )}
                {patient.vitals.temperature && (
                  <div>
                    <p className="text-sm text-gray-500">Temperature (°F)</p>
                    <p className="text-lg font-medium text-gray-900">{patient.vitals.temperature}</p>
                  </div>
                )}
                {patient.vitals.weight && (
                  <div>
                    <p className="text-sm text-gray-500">Weight (kg)</p>
                    <p className="text-lg font-medium text-gray-900">{patient.vitals.weight}</p>
                  </div>
                )}
                {patient.vitals.height && (
                  <div>
                    <p className="text-sm text-gray-500">Height (cm)</p>
                    <p className="text-lg font-medium text-gray-900">{patient.vitals.height}</p>
                  </div>
                )}
                {patient.vitals.bloodSugar && (
                  <div>
                    <p className="text-sm text-gray-500">Blood Sugar (mg/dL)</p>
                    <p className="text-lg font-medium text-gray-900">{patient.vitals.bloodSugar}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Export Buttons */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={() => exportToPDF()}
            className="px-4 py-2.5 sm:px-6 sm:py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            Export to PDF
          </button>
          <button
            onClick={() => exportToExcel()}
            className="px-4 py-2.5 sm:px-6 sm:py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            Export to Excel
          </button>
        </div>

        {/* Diagnostic Records */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">My Diagnostic Records</h2>
          </div>
          <div className="overflow-x-auto">
            {diagnostics.length === 0 ? (
              <div className="px-4 sm:px-6 py-8 text-center text-gray-500">
                No diagnostic records found.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {diagnostics.map((diagnostic) => (
                  <div key={diagnostic._id || diagnostic.id} className="px-4 sm:px-6 py-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm text-gray-500">
                          {new Date(diagnostic.date).toLocaleDateString()}
                        </p>
                        <h3 className="text-lg font-semibold text-gray-900 mt-1">
                          {diagnostic.diagnosis}
                        </h3>
                        {diagnostic.attendingDoctor && (
                          <p className="text-sm text-gray-600 mt-1">
                            Attending Doctor: <span className="font-medium">{diagnostic.attendingDoctor}</span>
                          </p>
                        )}
                        {diagnostic.patientName && (
                          <p className="text-sm text-gray-600 mt-1">
                            Patient: <span className="font-medium">{diagnostic.patientName}</span>
                          </p>
                        )}
                      </div>
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
                {doctor && (
                  <p className="text-xs text-gray-400 mt-1">
                    Added by Dr. {doctor.name}
                  </p>
                )}
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
    </div>
  );
}

