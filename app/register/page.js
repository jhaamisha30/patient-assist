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
    // Basic details
    age: '',
    gender: '',
    address: '',
    dateOfAdmission: '',
    cc: '',
    historyOfPresentIllness: '',
    bloodGroup: '',
    phone: '',
    // History
    past: '',
    surgical: '',
    medical: '',
    // Pain assessment
    onset: '',
    duration: '',
    typeBehaviour: '',
    aAndR: '',
    intensity: '',
    // Observation
    bodyBuilt: '',
    gait: '',
    attitudeOfLimb: '',
    posture: '',
    // Local observation
    skinTexture: '',
    skinColor: '',
    atrophy: '',
    swellingDeformity: '',
    // Palpation
    tenderness: '',
    temp: '',
    warmth: '',
    edema: '',
    crepitus: '',
    scar: '',
    muscleTightness: '',
    // Examination
    rom: '',
    lld: '',
    dermatomesAndMyotomes: '',
    // Investigation, Special test, Diagnosis, Treatment
    investigation: '',
    specialTest: '',
    provisionalDiagnosis: '',
    diagnosis: '',
    shortTermTreatment: '',
    longTermTreatment: '',
    // Vitals
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
      // Validate blood group for patients
      if (formData.role === 'patient' && !formData.bloodGroup) {
        setError('Blood group is required');
        toast.error('Please select your blood group');
        return;
      }

      // Prepare patient data object
      const patientData = formData.role === 'patient' ? {
        age: formData.age,
        bloodGroup: formData.bloodGroup,
        gender: formData.gender,
        address: formData.address,
        dateOfAdmission: formData.dateOfAdmission,
        cc: formData.cc,
        historyOfPresentIllness: formData.historyOfPresentIllness,
        phone: formData.phone,
        past: formData.past,
        surgical: formData.surgical,
        medical: formData.medical,
        onset: formData.onset,
        duration: formData.duration,
        typeBehaviour: formData.typeBehaviour,
        aAndR: formData.aAndR,
        intensity: formData.intensity,
        bodyBuilt: formData.bodyBuilt,
        gait: formData.gait,
        attitudeOfLimb: formData.attitudeOfLimb,
        posture: formData.posture,
        skinTexture: formData.skinTexture,
        skinColor: formData.skinColor,
        atrophy: formData.atrophy,
        swellingDeformity: formData.swellingDeformity,
        tenderness: formData.tenderness,
        temp: formData.temp,
        warmth: formData.warmth,
        edema: formData.edema,
        crepitus: formData.crepitus,
        scar: formData.scar,
        muscleTightness: formData.muscleTightness,
        rom: formData.rom,
        lld: formData.lld,
        dermatomesAndMyotomes: formData.dermatomesAndMyotomes,
        investigation: formData.investigation,
        specialTest: formData.specialTest,
        provisionalDiagnosis: formData.provisionalDiagnosis,
        diagnosis: formData.diagnosis,
        shortTermTreatment: formData.shortTermTreatment,
        longTermTreatment: formData.longTermTreatment,
        vitals: formData.vitals,
      } : {};

      const response = await register(
        formData.email,
        formData.password,
        formData.name,
        formData.role,
        formData.profilePic,
        formData.role === 'patient' ? formData.doctorId : null,
        formData.role === 'patient' ? formData.age : null,
        formData.role === 'patient' ? formData.vitals : null,
        formData.role === 'patient' ? formData.bloodGroup : null,
        patientData
      );
      
      if (response.success) {
        // Show appropriate message based on email status
        if (response.emailSent) {
        toast.success(response.message || 'Registration successful! Please check your email to verify your account.');
        } else if (response.emailError) {
          toast.warning(response.message || `Registration successful, but ${response.emailError}. Please check if the email address is valid.`);
        } else {
          toast.success(response.message || 'Registration successful!');
        }
        // Redirect to login page instead of dashboard
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      toast.error(errorMessage);
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
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {/* Authentication Details */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Authentication Details <span className="text-red-500">*</span></h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email <span className="text-red-500">*</span>
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
                        Password <span className="text-red-500">*</span>
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
                  </div>
                </div>

                {/* Basic Details */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Name <span className="text-red-500">*</span>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                          Age <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="age"
                          name="age"
                          type="number"
                          min="0"
                          value={formData.age}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter your age"
                        />
                      </div>
                      <div>
                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                          Gender <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="gender"
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        >
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-700 mb-2">
                        Blood Group <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="bloodGroup"
                        name="bloodGroup"
                        value={formData.bloodGroup}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
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
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows="2"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter your address"
                      />
                    </div>
                    <div>
                      <label htmlFor="dateOfAdmission" className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Admission
                      </label>
                      <input
                        id="dateOfAdmission"
                        name="dateOfAdmission"
                        type="date"
                        value={formData.dateOfAdmission}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="cc" className="block text-sm font-medium text-gray-700 mb-2">
                        CC (Chief Complaint)
                      </label>
                      <textarea
                        id="cc"
                        name="cc"
                        value={formData.cc}
                        onChange={handleChange}
                        rows="2"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter chief complaint"
                      />
                    </div>
                    <div>
                      <label htmlFor="historyOfPresentIllness" className="block text-sm font-medium text-gray-700 mb-2">
                        History of Present Illness
                      </label>
                      <textarea
                        id="historyOfPresentIllness"
                        name="historyOfPresentIllness"
                        value={formData.historyOfPresentIllness}
                        onChange={handleChange}
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter history of present illness"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter your phone number"
                      />
                    </div>
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
                    </div>
                  </div>
                </div>

                {/* History */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">History</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="past" className="block text-sm font-medium text-gray-700 mb-2">
                        Past
                      </label>
                      <textarea
                        id="past"
                        name="past"
                        value={formData.past}
                        onChange={handleChange}
                        rows="2"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter past history"
                      />
                    </div>
                    <div>
                      <label htmlFor="surgical" className="block text-sm font-medium text-gray-700 mb-2">
                        Surgical
                      </label>
                      <textarea
                        id="surgical"
                        name="surgical"
                        value={formData.surgical}
                        onChange={handleChange}
                        rows="2"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter surgical history"
                      />
                    </div>
                    <div>
                      <label htmlFor="medical" className="block text-sm font-medium text-gray-700 mb-2">
                        Medical
                      </label>
                      <textarea
                        id="medical"
                        name="medical"
                        value={formData.medical}
                        onChange={handleChange}
                        rows="2"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter medical history"
                      />
                    </div>
                  </div>
                </div>

                {/* Pain Assessment */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Pain Assessment</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="onset" className="block text-sm font-medium text-gray-700 mb-2">
                          Onset
                        </label>
                        <input
                          id="onset"
                          name="onset"
                          type="text"
                          value={formData.onset}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter onset"
                        />
                      </div>
                      <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                          Duration
                        </label>
                        <input
                          id="duration"
                          name="duration"
                          type="text"
                          value={formData.duration}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter duration"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="typeBehaviour" className="block text-sm font-medium text-gray-700 mb-2">
                        Type Behaviour
                      </label>
                      <input
                        id="typeBehaviour"
                        name="typeBehaviour"
                        type="text"
                        value={formData.typeBehaviour}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter type behaviour"
                      />
                    </div>
                    <div>
                      <label htmlFor="aAndR" className="block text-sm font-medium text-gray-700 mb-2">
                        A and R
                      </label>
                      <input
                        id="aAndR"
                        name="aAndR"
                        type="text"
                        value={formData.aAndR}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter A and R"
                      />
                    </div>
                    <div>
                      <label htmlFor="intensity" className="block text-sm font-medium text-gray-700 mb-2">
                        Intensity
                      </label>
                      <input
                        id="intensity"
                        name="intensity"
                        type="text"
                        value={formData.intensity}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter intensity"
                      />
                    </div>
                  </div>
                </div>

                {/* Observation */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Observation</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="bodyBuilt" className="block text-sm font-medium text-gray-700 mb-2">
                          Body Built
                        </label>
                        <input
                          id="bodyBuilt"
                          name="bodyBuilt"
                          type="text"
                          value={formData.bodyBuilt}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter body built"
                        />
                      </div>
                      <div>
                        <label htmlFor="gait" className="block text-sm font-medium text-gray-700 mb-2">
                          Gait
                        </label>
                        <input
                          id="gait"
                          name="gait"
                          type="text"
                          value={formData.gait}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter gait"
                        />
                      </div>
                      <div>
                        <label htmlFor="attitudeOfLimb" className="block text-sm font-medium text-gray-700 mb-2">
                          Attitude of Limb
                        </label>
                        <input
                          id="attitudeOfLimb"
                          name="attitudeOfLimb"
                          type="text"
                          value={formData.attitudeOfLimb}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter attitude of limb"
                        />
                      </div>
                      <div>
                        <label htmlFor="posture" className="block text-sm font-medium text-gray-700 mb-2">
                          Posture
                        </label>
                        <input
                          id="posture"
                          name="posture"
                          type="text"
                          value={formData.posture}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter posture"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Local Observation */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Local Observation</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="skinTexture" className="block text-sm font-medium text-gray-700 mb-2">
                          Skin Texture
                        </label>
                        <input
                          id="skinTexture"
                          name="skinTexture"
                          type="text"
                          value={formData.skinTexture}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter skin texture"
                        />
                      </div>
                      <div>
                        <label htmlFor="skinColor" className="block text-sm font-medium text-gray-700 mb-2">
                          Skin Color
                        </label>
                        <input
                          id="skinColor"
                          name="skinColor"
                          type="text"
                          value={formData.skinColor}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter skin color"
                        />
                      </div>
                      <div>
                        <label htmlFor="atrophy" className="block text-sm font-medium text-gray-700 mb-2">
                          Atrophy
                        </label>
                        <input
                          id="atrophy"
                          name="atrophy"
                          type="text"
                          value={formData.atrophy}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter atrophy"
                        />
                      </div>
                      <div>
                        <label htmlFor="swellingDeformity" className="block text-sm font-medium text-gray-700 mb-2">
                          Swelling Deformity
                        </label>
                        <input
                          id="swellingDeformity"
                          name="swellingDeformity"
                          type="text"
                          value={formData.swellingDeformity}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter swelling deformity"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Palpation */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Palpation</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="tenderness" className="block text-sm font-medium text-gray-700 mb-2">
                          Tenderness
                        </label>
                        <input
                          id="tenderness"
                          name="tenderness"
                          type="text"
                          value={formData.tenderness}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter tenderness"
                        />
                      </div>
                      <div>
                        <label htmlFor="temp" className="block text-sm font-medium text-gray-700 mb-2">
                          Temp
                        </label>
                        <input
                          id="temp"
                          name="temp"
                          type="text"
                          value={formData.temp}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter temp"
                        />
                      </div>
                      <div>
                        <label htmlFor="warmth" className="block text-sm font-medium text-gray-700 mb-2">
                          Warmth
                        </label>
                        <input
                          id="warmth"
                          name="warmth"
                          type="text"
                          value={formData.warmth}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter warmth"
                        />
                      </div>
                      <div>
                        <label htmlFor="edema" className="block text-sm font-medium text-gray-700 mb-2">
                          Edema
                        </label>
                        <input
                          id="edema"
                          name="edema"
                          type="text"
                          value={formData.edema}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter edema"
                        />
                      </div>
                      <div>
                        <label htmlFor="crepitus" className="block text-sm font-medium text-gray-700 mb-2">
                          Crepitus
                        </label>
                        <input
                          id="crepitus"
                          name="crepitus"
                          type="text"
                          value={formData.crepitus}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter crepitus"
                        />
                      </div>
                      <div>
                        <label htmlFor="scar" className="block text-sm font-medium text-gray-700 mb-2">
                          Scar
                        </label>
                        <input
                          id="scar"
                          name="scar"
                          type="text"
                          value={formData.scar}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter scar"
                        />
                      </div>
                      <div>
                        <label htmlFor="muscleTightness" className="block text-sm font-medium text-gray-700 mb-2">
                          Muscle Tightness
                        </label>
                        <input
                          id="muscleTightness"
                          name="muscleTightness"
                          type="text"
                          value={formData.muscleTightness}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          placeholder="Enter muscle tightness"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Examination */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Examination</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="rom" className="block text-sm font-medium text-gray-700 mb-2">
                        ROM
                      </label>
                      <input
                        id="rom"
                        name="rom"
                        type="text"
                        value={formData.rom}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter ROM"
                      />
                    </div>
                <div>
                      <label htmlFor="lld" className="block text-sm font-medium text-gray-700 mb-2">
                        LLD
                  </label>
                  <input
                        id="lld"
                        name="lld"
                        type="text"
                        value={formData.lld}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter LLD"
                      />
                    </div>
                    <div>
                      <label htmlFor="dermatomesAndMyotomes" className="block text-sm font-medium text-gray-700 mb-2">
                        Dermatomes and Myotomes
                      </label>
                      <textarea
                        id="dermatomesAndMyotomes"
                        name="dermatomesAndMyotomes"
                        value={formData.dermatomesAndMyotomes}
                        onChange={handleChange}
                        rows="2"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="Enter dermatomes and myotomes"
                      />
                    </div>
                  </div>
                </div>

                {/* Investigation */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Investigation</h3>
                  <div>
                    <label htmlFor="investigation" className="block text-sm font-medium text-gray-700 mb-2">
                      Investigation
                    </label>
                    <textarea
                      id="investigation"
                      name="investigation"
                      value={formData.investigation}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="Enter investigation details"
                    />
                  </div>
                </div>

                {/* Special Test */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Special Test</h3>
                  <div>
                    <label htmlFor="specialTest" className="block text-sm font-medium text-gray-700 mb-2">
                      Special Test
                    </label>
                    <textarea
                      id="specialTest"
                      name="specialTest"
                      value={formData.specialTest}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="Enter special test details"
                    />
                  </div>
                </div>

                {/* Provisional Diagnosis */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Provisional Diagnosis</h3>
                  <div>
                    <label htmlFor="provisionalDiagnosis" className="block text-sm font-medium text-gray-700 mb-2">
                      Provisional Diagnosis
                    </label>
                    <textarea
                      id="provisionalDiagnosis"
                      name="provisionalDiagnosis"
                      value={formData.provisionalDiagnosis}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="Enter provisional diagnosis"
                    />
                  </div>
                </div>

                {/* Diagnosis */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Diagnosis</h3>
                  <div>
                    <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700 mb-2">
                      Diagnosis
                    </label>
                    <textarea
                      id="diagnosis"
                      name="diagnosis"
                      value={formData.diagnosis}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="Enter diagnosis"
                    />
                  </div>
                </div>

                {/* Short Term Treatment */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Short Term Treatment</h3>
                  <div>
                    <label htmlFor="shortTermTreatment" className="block text-sm font-medium text-gray-700 mb-2">
                      Short Term Treatment
                    </label>
                    <textarea
                      id="shortTermTreatment"
                      name="shortTermTreatment"
                      value={formData.shortTermTreatment}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="Enter short term treatment"
                    />
                  </div>
                </div>

                {/* Long Term Treatment */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Long Term Treatment</h3>
                  <div>
                    <label htmlFor="longTermTreatment" className="block text-sm font-medium text-gray-700 mb-2">
                      Long Term Treatment
                    </label>
                    <textarea
                      id="longTermTreatment"
                      name="longTermTreatment"
                      value={formData.longTermTreatment}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      placeholder="Enter long term treatment"
                    />
                  </div>
                </div>

                {/* Vitals */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Vitals</h3>
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
              </div>
            )}

            {formData.role === 'doctor' && (
              <>
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
              </>
            )}

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

