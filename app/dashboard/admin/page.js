'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { getCurrentUser, getAdminData, deleteDoctor, deletePatientAdmin, deleteDiagnostic, logout, updateProfilePic, uploadImage } from '@/lib/api';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('doctors');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedDoctors, setExpandedDoctors] = useState(new Set());
  const [expandedPatients, setExpandedPatients] = useState(new Set());

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
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleDeleteDoctor = async (doctorId) => {
    if (!window.confirm('Are you sure you want to delete this doctor? All their patients will be unassigned.')) {
      return;
    }
    try {
      await deleteDoctor(doctorId);
      await loadAllData();
      toast.success('Doctor deleted successfully!');
    } catch (error) {
      toast.error('Error deleting doctor: ' + error.message);
    }
  };

  const handleDeletePatient = async (patientId) => {
    if (!window.confirm('Are you sure you want to delete this patient? This will also delete all their diagnostic records.')) {
      return;
    }
    try {
      await deletePatientAdmin(patientId);
      await loadAllData();
      toast.success('Patient deleted successfully!');
    } catch (error) {
      toast.error('Error deleting patient: ' + error.message);
    }
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('doctors')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'doctors'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Doctors ({doctors.length})
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'patients'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Patients ({patients.length})
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'diagnostics'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Diagnostics ({diagnostics.length})
            </button>
            <button
              onClick={() => setActiveTab('tree')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tree'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tree View
            </button>
          </nav>
        </div>

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">All Doctors</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {doctors.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                        No doctors found.
                      </td>
                    </tr>
                  ) : (
                    doctors.map((doctor) => (
                      <tr key={doctor.id} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doctor.name}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doctor.email}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDeleteDoctor(doctor.id)}
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
        )}

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">All Patients</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        No patients found.
                      </td>
                    </tr>
                  ) : (
                    patients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.name}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.age}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.email}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.currentDoctor || 'Unassigned'}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDeletePatient(patient.id)}
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
        )}

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
                      <div className="flex items-center justify-between p-3 bg-orange-50">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">⚠️</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">Unassigned Patients</h3>
                            <p className="text-xs text-gray-600">Patients without an attending doctor</p>
                          </div>
                        </div>
                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
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
                                  className="flex items-center justify-between p-2 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
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
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm">
                                      {isPatientExpanded ? '▼' : '▶'}
                                    </span>
                                    <div>
                                      <h4 className="font-medium text-gray-900 text-sm">{patient.name}</h4>
                                      <p className="text-xs text-gray-600">{patient.email}</p>
                                    </div>
                                  </div>
                                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                                    {patientDiagnostics.length} {patientDiagnostics.length === 1 ? 'diagnostic' : 'diagnostics'}
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
                    const isDoctorExpanded = expandedDoctors.has(doctor.id);

                    return (
                      <div key={doctor.id} className="border border-gray-200 rounded-lg">
                        {/* Doctor Node */}
                        <div
                          className="flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 cursor-pointer transition-colors"
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
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">
                              {isDoctorExpanded ? '▼' : '▶'}
                            </span>
                            <div>
                              <h3 className="font-semibold text-gray-900">Dr. {doctor.name}</h3>
                              <p className="text-xs text-gray-600">{doctor.email}</p>
                            </div>
                          </div>
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                            {doctorPatients.length} {doctorPatients.length === 1 ? 'patient' : 'patients'}
                          </span>
                        </div>

                        {/* Patients under Doctor */}
                        {isDoctorExpanded && (
                          <div className="pl-6 pr-3 py-2 bg-gray-50">
                            {doctorPatients.length === 0 ? (
                              <div className="text-sm text-gray-500 py-2">No patients assigned</div>
                            ) : (
                              <div className="space-y-2">
                                {doctorPatients.map((patient) => {
                                  const patientDiagnostics = diagnostics.filter(d => d.patientId === patient.id);
                                  const isPatientExpanded = expandedPatients.has(patient.id);

                                  return (
                                    <div key={patient.id} className="border border-gray-300 rounded-lg bg-white">
                                      {/* Patient Node */}
                                      <div
                                        className="flex items-center justify-between p-2 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
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
                                        <div className="flex items-center space-x-2">
                                          <span className="text-sm">
                                            {isPatientExpanded ? '▼' : '▶'}
                                          </span>
                                          <div>
                                            <h4 className="font-medium text-gray-900 text-sm">{patient.name}</h4>
                                            <p className="text-xs text-gray-600">{patient.email}</p>
                                          </div>
                                        </div>
                                        <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                                          {patientDiagnostics.length} {patientDiagnostics.length === 1 ? 'diagnostic' : 'diagnostics'}
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
                                })}
                              </div>
                            )}
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
    </div>
  );
}

