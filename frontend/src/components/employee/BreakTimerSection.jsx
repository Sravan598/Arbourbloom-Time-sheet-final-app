import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coffee, 
  Play, 
  Square, 
  Clock,
  UtensilsCrossed,
  Pause
} from 'lucide-react';
import axios from 'axios';
import { Button } from '../../components/ui/Button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const breakTypes = [
  { id: 'GENERAL', label: 'General', icon: Pause },
  { id: 'LUNCH', label: 'Lunch', icon: UtensilsCrossed },
  { id: 'COFFEE', label: 'Coffee', icon: Coffee },
];

const BreakTimerSection = ({ isClockedIn }) => {
  const [breakData, setBreakData] = useState(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [currentBreakStart, setCurrentBreakStart] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBreakType, setSelectedBreakType] = useState('GENERAL');
  const [processing, setProcessing] = useState(false);
  const timerRef = useRef(null);

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
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBreakData();
  }, [fetchBreakData]);

  // Timer effect
  useEffect(() => {
    if (isOnBreak && currentBreakStart) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now - currentBreakStart) / 1000);
        setElapsedTime(diff);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setElapsedTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isOnBreak, currentBreakStart]);

  const handleStartBreak = async () => {
    setProcessing(true);
    try {
      await axios.post(`${API}/breaks/start`, { break_type: selectedBreakType });
      await fetchBreakData();
    } catch (err) {
      console.error('Failed to start break:', err);
      alert(err.response?.data?.detail || 'Failed to start break');
    } finally {
      setProcessing(false);
    }
  };

  const handleEndBreak = async () => {
    setProcessing(true);
    try {
      await axios.post(`${API}/breaks/end`);
      await fetchBreakData();
    } catch (err) {
      console.error('Failed to end break:', err);
      alert(err.response?.data?.detail || 'Failed to end break');
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const formatTimeShort = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-3xl shadow-lg p-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Coffee className="w-6 h-6 text-brand-black" />
        <h2 className="text-xl font-bold text-brand-dark">Break Timer</h2>
      </div>

      {/* Not Clocked In Warning */}
      {!isClockedIn && !isOnBreak && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-yellow-700 text-sm">
            You need to clock in before taking a break.
          </p>
        </div>
      )}

      {/* Break Timer Display */}
      <div className="text-center mb-6">
        <AnimatePresence mode="wait">
          {isOnBreak ? (
            <motion.div
              key="on-break"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-200"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-3 h-3 bg-orange-500 rounded-full"
                />
                <span className="text-orange-600 font-medium">On Break</span>
              </div>
              <div className="text-5xl font-bold text-orange-600 font-mono mb-2">
                {formatTime(elapsedTime)}
              </div>
              <p className="text-orange-500 text-sm">Break in progress</p>
              
              <Button
                onClick={handleEndBreak}
                variant="primary"
                className="mt-4 bg-orange-500 hover:bg-orange-600"
                disabled={processing}
                data-testid="end-break-btn"
              >
                {processing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Break Type Selection */}
              <div className="flex justify-center gap-2 mb-4">
                {breakTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedBreakType(type.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        selectedBreakType === type.id
                          ? 'border-brand-black bg-brand-black/10 text-brand-black'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                      disabled={!isClockedIn}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={handleStartBreak}
                variant="primary"
                size="lg"
                disabled={!isClockedIn || processing}
                data-testid="start-break-btn"
              >
                {processing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Break
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Today's Summary */}
      {breakData && (
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-brand-dark">Today's Breaks</h3>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                Total: <strong className="text-brand-dark">{formatMinutes(breakData.total_break_minutes)}</strong>
              </span>
            </div>
          </div>

          {breakData.breaks.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 rounded-xl">
              <Coffee className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No breaks taken today</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {breakData.breaks.map((breakItem) => {
                const BreakIcon = breakTypes.find(t => t.id === breakItem.break_type)?.icon || Coffee;
                return (
                  <div
                    key={breakItem.id}
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      breakItem.status === 'ACTIVE' ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        breakItem.status === 'ACTIVE' ? 'bg-orange-200' : 'bg-gray-200'
                      }`}>
                        <BreakIcon className={`w-4 h-4 ${
                          breakItem.status === 'ACTIVE' ? 'text-orange-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-brand-dark">
                          {breakItem.break_type.charAt(0) + breakItem.break_type.slice(1).toLowerCase()} Break
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeShort(breakItem.start_time)}
                          {breakItem.end_time && ` - ${formatTimeShort(breakItem.end_time)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {breakItem.status === 'ACTIVE' ? (
                        <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                          In Progress
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-gray-700">
                          {breakItem.duration_minutes}m
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default BreakTimerSection;
