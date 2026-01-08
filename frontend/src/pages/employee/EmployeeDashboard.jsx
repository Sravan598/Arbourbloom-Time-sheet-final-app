import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, 
  LogOut, 
  Play, 
  Square, 
  FileText, 
  Timer,
  CheckCircle,
  AlertCircle,
  Calendar
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import LeavePTOSection from '../../components/employee/LeavePTOSection';
import BreakTimerSection from '../../components/employee/BreakTimerSection';
import WeeklyProgressSection from '../../components/employee/WeeklyProgressSection';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [currentShift, setCurrentShift] = useState(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [todayPunches, setTodayPunches] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCurrentShift = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/employee/current-shift`);
      setIsClockedIn(response.data.clocked_in);
      setCurrentShift(response.data.shift);
    } catch (err) {
      console.error('Failed to fetch current shift:', err);
    }
  }, []);

  const fetchTodayPunches = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/employee/today-punches`);
      setTodayPunches(response.data);
    } catch (err) {
      console.error('Failed to fetch today punches:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCurrentShift(), fetchTodayPunches()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchCurrentShift, fetchTodayPunches]);

  // Timer for elapsed time
  useEffect(() => {
    let interval;
    if (isClockedIn && currentShift?.clock_in_at) {
      const clockInTime = new Date(currentShift.clock_in_at).getTime();
      
      interval = setInterval(() => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - clockInTime) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    
    return () => clearInterval(interval);
  }, [isClockedIn, currentShift]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const handleClockIn = async () => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await axios.post(`${API}/employee/clock-in`);
      setSuccess('Successfully clocked in!');
      await fetchCurrentShift();
      await fetchTodayPunches();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to clock in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await axios.post(`${API}/employee/clock-out`);
      setSuccess('Successfully clocked out!');
      await fetchCurrentShift();
      await fetchTodayPunches();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to clock out');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_readable-link/artifacts/ufwwws2h_image.png" 
                alt="CORtracker" 
                className="h-8"
              />
              <div className="hidden sm:block border-l border-gray-200 pl-4">
                <p className="text-sm text-gray-500">Employee Dashboard</p>
                <p className="font-semibold text-brand-dark">{user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                to="/employee/timesheet" 
                className="flex items-center gap-2 text-gray-600 hover:text-brand-red transition-colors"
              >
                <FileText className="w-5 h-5" />
                <span className="hidden sm:inline">My Timesheet</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
                data-testid="logout-btn"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-700">{success}</p>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Clock In/Out Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-lg p-8"
          >
            <div className="text-center">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${
                isClockedIn ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Clock className={`w-10 h-10 ${isClockedIn ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              
              <h2 className="text-2xl font-bold text-brand-dark mb-2">
                {isClockedIn ? 'Currently Working' : 'Not Clocked In'}
              </h2>
              
              {isClockedIn ? (
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2 text-gray-500 mb-4">
                    <Timer className="w-5 h-5" />
                    <span>Shift started at {formatDateTime(currentShift?.clock_in_at)}</span>
                  </div>
                  <div className="text-5xl font-mono font-bold text-brand-red" data-testid="elapsed-time">
                    {formatTime(elapsedTime)}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 mb-6">Click the button below to start your shift</p>
              )}
              
              {isClockedIn ? (
                <Button
                  onClick={handleClockOut}
                  variant="secondary"
                  size="lg"
                  className="w-full max-w-xs"
                  disabled={actionLoading}
                  data-testid="clock-out-btn"
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Square className="w-5 h-5 mr-2" />
                      Clock Out
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleClockIn}
                  variant="primary"
                  size="lg"
                  className="w-full max-w-xs"
                  disabled={actionLoading}
                  data-testid="clock-in-btn"
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Clock In
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>

          {/* Today's Punches */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl shadow-lg p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-6 h-6 text-brand-red" />
              <h2 className="text-xl font-bold text-brand-dark">Today's Activity</h2>
            </div>
            
            {todayPunches.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No activity recorded today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayPunches.map((punch, index) => (
                  <div 
                    key={punch.id || index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${punch.clock_out_at ? 'bg-gray-400' : 'bg-green-500'}`} />
                        <span className="font-medium text-brand-dark">
                          {punch.clock_out_at ? 'Completed Shift' : 'Active Shift'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(punch.clock_in_at).toLocaleTimeString()} - {punch.clock_out_at ? new Date(punch.clock_out_at).toLocaleTimeString() : 'In Progress'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-brand-dark">
                        {punch.total_minutes ? formatDuration(punch.total_minutes) : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Link 
              to="/employee/timesheet"
              className="mt-6 block text-center text-brand-red hover:underline font-medium"
            >
              View Full Timesheet →
            </Link>
          </motion.div>
        </div>

        {/* Weekly Progress Section */}
        <div className="mt-8">
          <WeeklyProgressSection />
        </div>

        {/* Break Timer & Leave/PTO Sections */}
        <div className="mt-8 grid lg:grid-cols-2 gap-8">
          <BreakTimerSection isClockedIn={isClockedIn} />
          <LeavePTOSection />
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
