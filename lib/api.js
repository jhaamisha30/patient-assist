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
  return apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email, password, name, role, profilePic = '') {
  return apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, role, profilePic }),
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

