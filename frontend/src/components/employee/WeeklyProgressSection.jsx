import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Coffee,
  Download,
  FileText
} from 'lucide-react';
import axios from 'axios';
import { Button } from '../../components/ui/Button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const statusConfig = {
  ON_TRACK: {
    label: 'On Track',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    barColor: 'bg-green-500',
    icon: CheckCircle
  },
  COMPLETED: {
    label: 'Goal Reached!',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    barColor: 'bg-green-500',
    icon: CheckCircle
  },
  BEHIND: {
    label: 'Behind Schedule',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    barColor: 'bg-yellow-500',
    icon: AlertCircle
  },
  OVERTIME: {
    label: 'Overtime',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    barColor: 'bg-red-500',
    icon: AlertTriangle
  }
};

const WeeklyProgressSection = () => {
  const [progress, setProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/progress/weekly`);
      setProgress(response.data);
    } catch (err) {
      console.error('Failed to fetch weekly progress:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
    // Refresh every 5 minutes
    const interval = setInterval(fetchProgress, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchProgress]);

  const formatHours = (hours) => {
    if (hours === 0) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  const config = statusConfig[progress.status] || statusConfig.ON_TRACK;
  const StatusIcon = config.icon;
  const remainingHours = Math.max(0, progress.goal_hours - progress.total_hours);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-lg p-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-brand-red" />
          <h2 className="text-xl font-bold text-brand-dark">Weekly Progress</h2>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.bgColor}`}>
          <StatusIcon className={`w-4 h-4 ${config.color}`} />
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        </div>
      </div>

      {/* Main Progress Display */}
      <div className="mb-6">
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-4xl font-bold text-brand-dark">{formatHours(progress.total_hours)}</span>
            <span className="text-xl text-gray-400 ml-2">/ {progress.goal_hours}h</span>
          </div>
          <span className={`text-2xl font-bold ${config.color}`}>
            {Math.round(progress.progress_percent)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress.progress_percent, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full ${config.barColor} rounded-full relative`}
          >
            {progress.progress_percent > 100 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((progress.progress_percent - 100) / progress.progress_percent) * 100}%` }}
                transition={{ duration: 0.5, delay: 1 }}
                className="absolute right-0 top-0 h-full bg-red-600 rounded-r-full"
              />
            )}
          </motion.div>
        </div>

        {/* Status Message */}
        <div className="mt-3 flex items-center justify-between text-sm">
          {progress.status === 'OVERTIME' ? (
            <span className="text-red-600 font-medium">
              ⚠️ {formatHours(progress.total_hours - progress.goal_hours)} overtime
            </span>
          ) : progress.status === 'COMPLETED' ? (
            <span className="text-green-600 font-medium">
              ✅ Weekly goal completed!
            </span>
          ) : (
            <span className="text-gray-600">
              {formatHours(remainingHours)} remaining to reach goal
            </span>
          )}
          
          {progress.break_minutes > 0 && (
            <span className="flex items-center gap-1 text-gray-500">
              <Coffee className="w-4 h-4" />
              {Math.round(progress.break_minutes)}m breaks
            </span>
          )}
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="border-t border-gray-100 pt-6">
        <h3 className="font-semibold text-brand-dark mb-4">Daily Breakdown</h3>
        <div className="grid grid-cols-7 gap-2">
          {progress.daily_breakdown.map((day, index) => {
            const isToday = new Date().toISOString().split('T')[0] === day.date;
            const hasHours = day.hours_worked > 0;
            const targetDaily = progress.goal_hours / 5; // Assuming 5 work days
            const isWorkday = index < 5; // Mon-Fri
            const metTarget = day.hours_worked >= targetDaily;
            
            return (
              <div
                key={day.date}
                className={`text-center p-3 rounded-xl transition-colors ${
                  isToday 
                    ? 'bg-brand-red/10 border-2 border-brand-red' 
                    : hasHours 
                      ? 'bg-gray-50' 
                      : 'bg-gray-50/50'
                }`}
              >
                <p className={`text-xs font-medium mb-1 ${isToday ? 'text-brand-red' : 'text-gray-500'}`}>
                  {day.day_name}
                </p>
                <p className={`text-lg font-bold ${
                  hasHours 
                    ? metTarget 
                      ? 'text-green-600' 
                      : 'text-brand-dark'
                    : 'text-gray-300'
                }`}>
                  {hasHours ? `${day.hours_worked}h` : '-'}
                </p>
                {isWorkday && hasHours && metTarget && (
                  <CheckCircle className="w-4 h-4 text-green-500 mx-auto mt-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Week Range */}
      <div className="mt-4 text-center text-xs text-gray-400">
        Week: {new Date(progress.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(progress.week_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
    </motion.div>
  );
};

export default WeeklyProgressSection;
