export async function apiCall(endpoint, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  const response = await fetch(endpoint, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export async function getCurrentUser() {
  try {
    const data = await apiCall('/api/auth/me');
    return data.user;
  } catch (error) {
    return null;
  }
}

export async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error || 'Login failed');
    if (data.requiresVerification) {
      error.requiresVerification = true;
    }
    throw error;
  }

  return data;
}

export async function register(email, password, name, role, profilePic = '', doctorId = null, age = null, vitals = null) {
  return apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, role, profilePic, doctorId, age, vitals }),
  });
}

export async function logout() {
  return apiCall('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getPatients() {
  return apiCall('/api/patients', {
    cache: 'no-store',
  });
}

export async function getMyPatientRecord() {
  return apiCall('/api/patients/me');
}

export async function addPatient(patientData) {
  return apiCall('/api/patients', {
    method: 'POST',
    body: JSON.stringify(patientData),
  });
}

export async function deletePatient(patientId) {
  return apiCall(`/api/patients/${patientId}`, {
    method: 'DELETE',
  });
}

export async function updatePatient(patientId, patientData) {
  return apiCall(`/api/patients/${patientId}`, {
    method: 'PUT',
    body: JSON.stringify(patientData),
  });
}

export async function getDiagnostics(patientId = null) {
  const url = patientId 
    ? `/api/diagnostics?patientId=${patientId}`
    : '/api/diagnostics';
  return apiCall(url);
}

export async function addDiagnostic(diagnosticData) {
  return apiCall('/api/diagnostics', {
    method: 'POST',
    body: JSON.stringify(diagnosticData),
  });
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Upload failed');
  }

  return data;
}

export function exportToPDF(patientId = null) {
  const url = patientId 
    ? `/api/export/pdf?patientId=${patientId}`
    : '/api/export/pdf';
  window.open(url, '_blank');
}

export function exportToExcel(patientId = null) {
  const url = patientId 
    ? `/api/export/excel?patientId=${patientId}`
    : '/api/export/excel';
  window.open(url, '_blank');
}

// Admin functions
export async function getAdminData() {
  return apiCall('/api/admin');
}

export async function deleteDoctor(doctorId, password) {
  return apiCall(`/api/admin/doctors/${doctorId}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}

export async function deletePatientAdmin(patientId, password) {
  return apiCall(`/api/admin/patients/${patientId}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}

export async function deleteDiagnostic(diagnosticId) {
  return apiCall(`/api/admin/diagnostics/${diagnosticId}`, {
    method: 'DELETE',
  });
}

// Profile functions
export async function updateProfilePic(profilePicUrl) {
  return apiCall('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({ profilePic: profilePicUrl }),
  });
}

// Doctor functions
export async function getDoctors() {
  return apiCall('/api/doctors');
}

export async function getUnassignedPatients() {
  return apiCall('/api/patients?unassigned=true');
}

export async function assignPatient(patientId) {
  return apiCall('/api/patients/assign', {
    method: 'PUT',
    body: JSON.stringify({ patientId }),
  });
}

// Auth functions
export async function resendVerificationEmail() {
  return apiCall('/api/auth/resend-verification', {
    method: 'POST',
  });
}

