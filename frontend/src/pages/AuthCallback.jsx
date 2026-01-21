import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * AuthCallback - Handles Google OAuth redirect
 * Processes session_id from URL fragment and exchanges it for JWT token
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processGoogleAuth = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = window.location.hash;
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);
        
        if (!sessionIdMatch) {
          console.error('No session_id found in URL');
          navigate('/login', { replace: true });
          return;
        }

        const sessionId = sessionIdMatch[1];

        // Exchange session_id for JWT token
        const response = await fetch(`${API}/api/auth/google/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Google auth failed:', error);
          navigate('/login', { 
            replace: true,
            state: { error: error.detail || 'Google authentication failed' }
          });
          return;
        }

        const data = await response.json();
        
        // Store token and user data
        localStorage.setItem('cortracker_token', data.access_token);
        setToken(data.access_token);
        setUser(data.user);

        // Clear the URL fragment and redirect to appropriate dashboard
        window.history.replaceState(null, '', window.location.pathname);
        
        if (data.user.role === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/employee/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error processing Google auth:', error);
        navigate('/login', { 
          replace: true,
          state: { error: 'Failed to complete Google authentication' }
        });
      }
    };

    processGoogleAuth();
  }, [navigate, setUser, setToken]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
