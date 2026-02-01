import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// This page redirects to the tenant-specific signup page
// Regular users should use tenant-specific signup pages (e.g., /aurborbloom/signup)
const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Preserve any invitation code in the redirect
    const code = searchParams.get('code');
    const redirectUrl = code 
      ? `/aurborbloom/signup?code=${code}`
      : '/aurborbloom/signup';
    
    navigate(redirectUrl, { replace: true });
  }, [navigate, searchParams]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to signup...</p>
      </div>
    </div>
  );
};

export default Signup;
