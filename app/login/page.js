'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login, getCurrentUser, resendVerificationEmail } from '@/lib/api';
import { toast } from 'react-toastify';

function LoginContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [resending, setResending] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for verification success/error messages from URL
    const verified = searchParams.get('verified');
    const message = searchParams.get('message');
    const error = searchParams.get('error');

    if (verified === 'true') {
      const msg = message === 'success' 
        ? 'Email verified successfully! You can now log in.' 
        : message === 'already_verified'
        ? 'Email is already verified. You can log in.'
        : decodeURIComponent(message);
      toast.success(msg);
      // Clear the URL parameters
      router.replace('/login');
    } else if (error) {
      let errorMsg = '';
      if (error === 'invalid_token') {
        errorMsg = 'Invalid verification token. Please request a new verification email.';
      } else if (error === 'expired_token') {
        errorMsg = 'Verification token has expired. Please request a new verification email.';
      } else if (error === 'server_error') {
        errorMsg = 'Server error occurred. Please try again later.';
      } else if (error !== 'no_token') {
        errorMsg = decodeURIComponent(error);
      }
      if (errorMsg) {
        setError(errorMsg);
        toast.error(errorMsg);
      }
      // Clear the URL parameters
      router.replace('/login');
    }

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
  }, [router, searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password);
      if (response.success) {
        if (response.user.role === 'admin') {
          router.push('/dashboard/admin');
        } else if (response.user.role === 'doctor') {
          router.push('/dashboard/doctor');
        } else if (response.user.role === 'patient') {
          router.push('/dashboard/patient');
        } else {
          setError('Unknown user role');
        }
      }
    } catch (err) {
      // Check if error is due to unverified email
      if (err.message && err.message.includes('verify')) {
        setRequiresVerification(true);
        setError(err.message);
      } else {
        setError(err.message || 'Login failed');
        setRequiresVerification(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
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
            <p className="text-gray-600">Sign in to your account</p>
            <p className="text-sm text-gray-500 mt-2">Patients: Use credentials provided by your doctor or register yourself</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
              {requiresVerification && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={async () => {
                      setResending(true);
                      try {
                        await resendVerificationEmail();
                        toast.success('Verification email sent! Please check your inbox.');
                        setError('');
                        setRequiresVerification(false);
                      } catch (err) {
                        toast.error(err.message || 'Failed to resend verification email');
                      } finally {
                        setResending(false);
                      }
                    }}
                    disabled={resending}
                    className="text-sm text-green-600 hover:text-green-700 underline disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend verification email'}
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-gray-600">
              Are you a doctor or a patient?{' '}
              <Link href="/register" className="text-green-600 hover:text-green-700 font-medium">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

