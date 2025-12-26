'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getPatients, addPatient, addDiagnostic, getDiagnostics, deletePatient, logout, exportToPDF, exportToExcel } from '@/lib/api';

export default function DoctorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddDiagnostic, setShowAddDiagnostic] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDiagnostics, setPatientDiagnostics] = useState([]);

  const [patientForm, setPatientForm] = useState({
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

  useEffect(() => {
    async function loadData() {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'doctor') {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      
      await loadPatients();
      setLoading(false);
    }
    loadData();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
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
        });
        alert('Patient added successfully!');
      }
    } catch (error) {
      alert('Error adding patient: ' + error.message);
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
        alert('Diagnostic record added successfully!');
        if (selectedPatient) {
          loadPatientDiagnostics(selectedPatient);
        }
      }
    } catch (error) {
      alert('Error adding diagnostic: ' + error.message);
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

  const handleDeletePatient = async (patient) => {
    const patientId = patient._id || patient.id;
    const patientName = patient.name;
    
    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete patient "${patientName}"?\n\nThis will permanently delete:\n- Patient record\n- All diagnostic records\n- Patient user account\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await deletePatient(patientId);
      if (response.success) {
        alert('Patient deleted successfully!');
        await loadPatients(); // Refresh the list
      }
    } catch (error) {
      alert('Error deleting patient: ' + error.message);
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
              <span className="text-sm sm:text-base text-gray-500 hidden sm:inline">Doctor Dashboard</span>
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
        {/* Add Patient Button and Refresh */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={() => setShowAddPatient(true)}
            className="px-4 py-2.5 sm:px-6 sm:py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
          >
            + Add New Patient
          </button>
          <button
            onClick={loadPatients}
            className="px-4 py-2.5 sm:px-6 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors text-sm sm:text-base"
          >
            🔄 Refresh List
          </button>
        </div>

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
    </div>
  );
}

