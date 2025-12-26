'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getDiagnostics, getMyPatientRecord, logout, exportToPDF, exportToExcel } from '@/lib/api';

export default function PatientDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);

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
                <img src={user.profilePic} alt="Profile" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover" />
              )}
              <div className="flex-1 sm:flex-none min-w-0">
                <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{user?.name}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
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
    </div>
  );
}

