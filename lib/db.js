import clientPromise from './mongodb';

export async function getDb() {
  const client = await clientPromise;
  return client.db('patient-assist');
}

export async function getUsersCollection() {
  const db = await getDb();
  return db.collection('users');
}

export async function getPatientsCollection() {
  const db = await getDb();
  return db.collection('patients');
}

export async function getDiagnosticsCollection() {
  const db = await getDb();
  return db.collection('diagnostics');
}

export async function getCertificatesCollection() {
  const db = await getDb();
  return db.collection('certificates');
}

export async function getDoctorsCollection() {
  const db = await getDb();
  return db.collection('doctors');
}

export async function getLabReportsCollection() {
  const db = await getDb();
  return db.collection('labReports');
}

