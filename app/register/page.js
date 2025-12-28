'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register, getCurrentUser, uploadImage, getDoctors } from '@/lib/api';
import { toast } from 'react-toastify';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    profilePic: '',
    role: 'doctor',
    doctorId: '',
    age: '',
    vitals: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      weight: '',
      height: '',
      bloodSugar: '',
    },
  });
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser();
      if (user) {
        if (user.role === 'admin') {
          router.push('/dashboard/admin');
        } else if (user.role === 'doctor') {
          router.push('/dashboard/doctor');
        } else if (user.role === 'patient') {
          router.push('/dashboard/patient');
        }
      }
    }
    checkAuth();
    loadDoctors();
  }, [router]);

  const loadDoctors = async () => {
    try {
      const data = await getDoctors();
      setDoctors(data.doctors || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const handleChange = (e) => {
    if (e.target.name.startsWith('vitals.')) {
      const vitalField = e.target.name.split('.')[1];
      setFormData({
        ...formData,
        vitals: {
          ...formData.vitals,
          [vitalField]: e.target.value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value,
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await uploadImage(file);
      setFormData({
        ...formData,
        profilePic: response.url,
      });
    } catch (err) {
      setError('Failed to upload image: ' + (err.message || 'Please check your Cloudinary configuration'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await register(
        formData.email,
        formData.password,
        formData.name,
        formData.role,
        formData.profilePic,
        formData.role === 'patient' ? formData.doctorId : null,
        formData.role === 'patient' ? formData.age : null,
        formData.role === 'patient' ? formData.vitals : null
      );
      
      if (response.success) {
        // Show success message about email verification
        toast.success(response.message || 'Registration successful! Please check your email to verify your account.');
        // Redirect to login page instead of dashboard
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img 
                src="/patientAssistLogoSVGWithWhiteBG.svg" 
                alt="Patient Assist Logo" 
                className="h-28 sm:h-36 md:h-40 w-auto"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">Patient Assist</h1>
            <p className="text-gray-600">Registration</p>
            <p className="text-sm text-gray-500 mt-2">Create an account as a doctor or patient</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                I am a
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              >
                <option value="doctor">Doctor</option>
                <option value="patient">Patient</option>
              </select>
            </div>

            {formData.role === 'patient' && (
              <>
                <div>
                  <label htmlFor="doctorId" className="block text-sm font-medium text-gray-700 mb-2">
                    Attending Doctor (Optional)
                  </label>
                  <select
                    id="doctorId"
                    name="doctorId"
                    value={formData.doctorId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  >
                    <option value="">Select a doctor (optional)</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.email}
                      </option>
                    ))}
                  </select>
                  {doctors.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">No doctors available. You can still create an account.</p>
                  )}
                </div>

                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                    Age (Optional)
                  </label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    min="0"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="Enter your age"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Vitals (Optional)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="vitals.bloodPressure" className="block text-xs font-medium text-gray-700 mb-1">
                        Blood Pressure
                      </label>
                      <input
                        id="vitals.bloodPressure"
                        name="vitals.bloodPressure"
                        type="text"
                        value={formData.vitals.bloodPressure}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                        placeholder="e.g., 120/80"
                      />
                    </div>
                    <div>
                      <label htmlFor="vitals.heartRate" className="block text-xs font-medium text-gray-700 mb-1">
                        Heart Rate (bpm)
                      </label>
                      <input
                        id="vitals.heartRate"
                        name="vitals.heartRate"
                        type="text"
                        value={formData.vitals.heartRate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                        placeholder="e.g., 72"
                      />
                    </div>
                    <div>
                      <label htmlFor="vitals.temperature" className="block text-xs font-medium text-gray-700 mb-1">
                        Temperature (°F)
                      </label>
                      <input
                        id="vitals.temperature"
                        name="vitals.temperature"
                        type="text"
                        value={formData.vitals.temperature}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                        placeholder="e.g., 98.6"
                      />
                    </div>
                    <div>
                      <label htmlFor="vitals.weight" className="block text-xs font-medium text-gray-700 mb-1">
                        Weight (kg)
                      </label>
                      <input
                        id="vitals.weight"
                        name="vitals.weight"
                        type="text"
                        value={formData.vitals.weight}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                        placeholder="e.g., 70"
                      />
                    </div>
                    <div>
                      <label htmlFor="vitals.height" className="block text-xs font-medium text-gray-700 mb-1">
                        Height (cm)
                      </label>
                      <input
                        id="vitals.height"
                        name="vitals.height"
                        type="text"
                        value={formData.vitals.height}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                        placeholder="e.g., 170"
                      />
                    </div>
                    <div>
                      <label htmlFor="vitals.bloodSugar" className="block text-xs font-medium text-gray-700 mb-1">
                        Blood Sugar (mg/dL)
                      </label>
                      <input
                        id="vitals.bloodSugar"
                        name="vitals.bloodSugar"
                        type="text"
                        value={formData.vitals.bloodSugar}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                        placeholder="e.g., 100"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="Enter your password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="Confirm your password"
              />
            </div>

            <div>
              <label htmlFor="profilePic" className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture (Optional)
              </label>
              <input
                id="profilePic"
                name="profilePic"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              {uploading && <p className="mt-2 text-sm text-gray-500">Uploading...</p>}
              {formData.profilePic && (
                <img src={formData.profilePic} alt="Profile" className="mt-2 w-20 h-20 rounded-full object-cover" />
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-green-600 hover:text-green-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

