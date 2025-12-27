'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let progressInterval;
    let startTime = Date.now();
    const minDisplayTime = 1500; // Minimum 1.5 seconds to show loading

    // Animate progress bar smoothly
    progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) {
          return 90; // Stop at 90% until auth completes
        }
        return prev + 2; // Increment by 2% each interval
      });
    }, 30); // Update every 30ms for smooth animation

    async function checkAuth() {
      try {
        const user = await getCurrentUser();
        
        // Ensure minimum display time
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsed);
        
        await new Promise(resolve => setTimeout(resolve, remainingTime));
        
        // Complete the progress bar
        setLoadingProgress(100);
        setIsComplete(true);
        
        // Small delay to show completed bar before redirect
        setTimeout(() => {
          if (user) {
            if (user.role === 'admin') {
              router.push('/dashboard/admin');
            } else if (user.role === 'doctor') {
              router.push('/dashboard/doctor');
            } else if (user.role === 'patient') {
              router.push('/dashboard/patient');
            }
          } else {
            router.push('/login');
          }
        }, 200);
      } catch (error) {
        // On error, still complete and redirect to login
        setLoadingProgress(100);
        setIsComplete(true);
        setTimeout(() => {
          router.push('/login');
        }, 200);
      }
    }

    checkAuth();

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src="/patientAssistLogoSVGWithWhiteBG.svg" 
            alt="Patient Assist Logo" 
            className="h-24 sm:h-32 md:h-40 w-auto animate-pulse"
          />
        </div>
        
        {/* Loading Bar Container */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden relative">
          <div 
            className="h-full bg-green-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
        
        {/* Loading Text */}
        <p className="mt-4 text-gray-600 text-sm">Loading Patient Assist...</p>
      </div>
    </div>
  );
}
