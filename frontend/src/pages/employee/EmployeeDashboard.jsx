import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  LogOut, 
  Play, 
  Square, 
  Timer,
  CheckCircle,
  AlertCircle,
  User,
  ChevronDown,
  Settings,
  MessageSquare,
  Coffee,
  UtensilsCrossed,
  Pause
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import WeeklyProgressSection from '../../components/employee/WeeklyProgressSection';
import AnnouncementsSection from '../../components/employee/AnnouncementsSection';
import EmployeeSidebar from '../../components/employee/EmployeeSidebar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Break types for the integrated break timer
const breakTypes = [
  { id: 'GENERAL', label: 'General', icon: Pause },
  { id: 'LUNCH', label: 'Lunch', icon: UtensilsCrossed },
  { id: 'COFFEE', label: 'Coffee', icon: Coffee },
];

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const profileDropdownRef = useRef(null);
  
  const [currentShift, setCurrentShift] = useState(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clockInNote, setClockInNote] = useState('');
  const [clockOutNote, setClockOutNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profileData, setProfileData] = useState(null);
  
  // Break timer state
  const [breakData, setBreakData] = useState(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [currentBreakStart, setCurrentBreakStart] = useState(null);
  const [breakElapsedTime, setBreakElapsedTime] = useState(0);
  const [selectedBreakType, setSelectedBreakType] = useState('GENERAL');
  const [breakProcessing, setBreakProcessing] = useState(false);
  const breakTimerRef = useRef(null);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API}/profile`);
        setProfileData(response.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCurrentShift = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/employee/current-shift`);
      setIsClockedIn(response.data.clocked_in);
      setCurrentShift(response.data.shift);
    } catch (err) {
      console.error('Failed to fetch current shift:', err);
    }
  }, []);

  // Fetch break data
  const fetchBreakData = useCallback(async () => {
    try {
      const [statusRes, todayRes] = await Promise.all([
        axios.get(`${API}/breaks/status`),
        axios.get(`${API}/breaks/today`)
      ]);
      
      setIsOnBreak(statusRes.data.is_on_break);
      if (statusRes.data.is_on_break && statusRes.data.start_time) {
        setCurrentBreakStart(new Date(statusRes.data.start_time));
      } else {
        setCurrentBreakStart(null);
      }
      
      setBreakData(todayRes.data);
    } catch (err) {
      console.error('Failed to fetch break data:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCurrentShift(), fetchBreakData()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchCurrentShift, fetchBreakData]);

  // Timer for elapsed time (clock in)
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

  // Timer for break elapsed time
  useEffect(() => {
    if (isOnBreak && currentBreakStart) {
      breakTimerRef.current = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now - currentBreakStart) / 1000);
        setBreakElapsedTime(diff);
      }, 1000);
    } else {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current);
      }
      setBreakElapsedTime(0);
    }

    return () => {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current);
      }
    };
  }, [isOnBreak, currentBreakStart]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBreakTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes) => {
    if (!minutes) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
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

  // Break handlers
  const handleStartBreak = async () => {
    setBreakProcessing(true);
    try {
      await axios.post(`${API}/breaks/start`, { break_type: selectedBreakType });
      await fetchBreakData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start break');
    } finally {
      setBreakProcessing(false);
    }
  };

  const handleEndBreak = async () => {
    setBreakProcessing(true);
    try {
      await axios.post(`${API}/breaks/end`);
      await fetchBreakData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to end break');
    } finally {
      setBreakProcessing(false);
    }
  };

  const handleClockIn = async () => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await axios.post(`${API}/employee/clock-in`, { 
        notes: clockInNote || null 
      });
      setSuccess('Successfully clocked in!');
      setClockInNote('');
      setShowNoteInput(false);
      await fetchCurrentShift();
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
      await axios.post(`${API}/employee/clock-out`, {
        notes: clockOutNote || null
      });
      setSuccess('Successfully clocked out!');
      setClockOutNote('');
      setShowNoteInput(false);
      await fetchCurrentShift();
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <EmployeeSidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-brand-dark">Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, {profileData?.name || user?.name}</p>
              </div>
              
              {/* Profile Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2 hover:bg-gray-100 rounded-full py-1 pl-1 pr-3 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                    {profileData?.profile_image ? (
                      <img 
                        src={profileData.profile_image} 
                        alt={profileData?.name || user?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-red to-brand-red-dark">
                        <span className="text-sm font-bold text-white">
                          {(profileData?.name || user?.name)?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="hidden sm:inline font-medium text-brand-dark text-sm">
                    {profileData?.name || user?.name}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showProfileDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50"
                    >
                      {/* Profile Header */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-semibold text-brand-dark">{profileData?.name || user?.name}</p>
                        <p className="text-sm text-gray-500 truncate">{profileData?.email || user?.email}</p>
                        {profileData?.job_title && (
                          <p className="text-xs text-gray-400 mt-1">{profileData.job_title}</p>
                        )}
                      </div>
                      
                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          to="/profile"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          <span>My Profile</span>
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Settings</span>
                        </Link>
                      </div>
                      
                      {/* Logout */}
                      <div className="border-t border-gray-100 pt-1">
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            handleLogout();
                          }}
                          className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-8">
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
          {/* Clock In/Out Card with Integrated Break Timer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-lg p-8"
          >
            {/* Clock Section */}
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                isClockedIn ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Clock className={`w-8 h-8 ${isClockedIn ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              
              <h2 className="text-xl font-bold text-brand-dark mb-1">
                {isClockedIn ? 'Currently Working' : 'Not Clocked In'}
              </h2>
              
              {isClockedIn ? (
                <div className="mb-4">
                  <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-2">
                    <Timer className="w-4 h-4" />
                    <span>Started at {new Date(currentShift?.clock_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                  </div>
                  <div className="text-4xl font-mono font-bold text-brand-red" data-testid="elapsed-time">
                    {formatTime(elapsedTime)}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 mb-4 text-sm">Click below to start your shift</p>
              )}
              
              {/* Quick Notes Toggle */}
              <div className="mb-3">
                <button
                  onClick={() => setShowNoteInput(!showNoteInput)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-red transition-colors mx-auto"
                >
                  <MessageSquare className="w-4 h-4" />
                  {showNoteInput ? 'Hide note' : 'Add note (optional)'}
                </button>
              </div>

              {/* Note Input */}
              {showNoteInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 w-full max-w-xs mx-auto"
                >
                  <textarea
                    value={isClockedIn ? clockOutNote : clockInNote}
                    onChange={(e) => isClockedIn ? setClockOutNote(e.target.value) : setClockInNote(e.target.value)}
                    placeholder={isClockedIn ? "Note for clocking out..." : "Note for clocking in..."}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-transparent resize-none text-sm"
                    rows={2}
                    maxLength={200}
                    data-testid="clock-note-input"
                  />
                </motion.div>
              )}

              {isClockedIn ? (
                <Button
                  onClick={handleClockOut}
                  variant="secondary"
                  size="md"
                  className="w-full max-w-xs"
                  disabled={actionLoading || isOnBreak}
                  data-testid="clock-out-btn"
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Clock Out
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleClockIn}
                  variant="primary"
                  size="md"
                  className="w-full max-w-xs"
                  disabled={actionLoading}
                  data-testid="clock-in-btn"
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Clock In
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Integrated Break Timer Section */}
            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-brand-red" />
                  <h3 className="font-semibold text-brand-dark">Break Timer</h3>
                </div>
                {breakData && (
                  <span className="text-sm text-gray-500">
                    Today: <strong className="text-brand-dark">{formatMinutes(breakData.total_break_minutes)}</strong>
                  </span>
                )}
              </div>

              {/* Not Clocked In Warning */}
              {!isClockedIn && !isOnBreak && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                  <p className="text-yellow-700 text-sm text-center">
                    Clock in first to take a break
                  </p>
                </div>
              )}

              <AnimatePresence mode="wait">
                {isOnBreak ? (
                  <motion.div
                    key="on-break"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200"
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-2 h-2 bg-orange-500 rounded-full"
                      />
                      <span className="text-orange-600 font-medium text-sm">On Break</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-600 font-mono text-center mb-3">
                      {formatBreakTime(breakElapsedTime)}
                    </div>
                    
                    <Button
                      onClick={handleEndBreak}
                      variant="primary"
                      size="sm"
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      disabled={breakProcessing}
                      data-testid="end-break-btn"
                    >
                      {breakProcessing ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Square className="w-4 h-4 mr-2" />
                          End Break
                        </>
                      )}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="not-on-break"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                  >
                    {/* Break Type Selection */}
                    <div className="flex justify-center gap-2 mb-3">
                      {breakTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.id}
                            onClick={() => setSelectedBreakType(type.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-sm ${
                              selectedBreakType === type.id
                                ? 'border-brand-red bg-brand-red/10 text-brand-red'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            }`}
                            disabled={!isClockedIn}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="font-medium">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <Button
                      onClick={handleStartBreak}
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={!isClockedIn || breakProcessing}
                      data-testid="start-break-btn"
                    >
                      {breakProcessing ? (
                        <div className="w-4 h-4 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start Break
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Announcements Section - Now next to Clock Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <AnnouncementsSection />
          </motion.div>
        </div>

        {/* Weekly Progress Section */}
        <div className="mt-8">
          <WeeklyProgressSection />
        </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
