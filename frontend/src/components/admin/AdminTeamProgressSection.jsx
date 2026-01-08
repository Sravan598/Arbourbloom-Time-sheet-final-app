import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import axios from 'axios';

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
    label: 'Completed',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    barColor: 'bg-green-500',
    icon: CheckCircle
  },
  BEHIND: {
    label: 'Behind',
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

const AdminTeamProgressSection = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/progress/team`);
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch team progress:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.team_progress.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-brand-red" />
          <h2 className="text-lg font-bold text-brand-dark">Team Weekly Progress</h2>
        </div>
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No employee data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      {/* Overtime Alert for Admin */}
      {data.summary.overtime > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-red-700">Overtime Alert!</p>
            <p className="text-sm text-red-600">
              {data.summary.overtime} employee{data.summary.overtime > 1 ? 's have' : ' has'} exceeded the weekly hour limit.
              Review and take action.
            </p>
          </div>
        </motion.div>
      )}

      {/* Behind Schedule Warning for Admin */}
      {data.summary.behind > 0 && data.summary.overtime === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="font-semibold text-yellow-700">Attention Required</p>
            <p className="text-sm text-yellow-600">
              {data.summary.behind} employee{data.summary.behind > 1 ? 's are' : ' is'} behind schedule this week.
            </p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-brand-red" />
          <h2 className="text-lg font-bold text-brand-dark">Team Weekly Progress</h2>
        </div>
        <div className="text-xs text-gray-500">
          {new Date(data.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(data.week_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-brand-dark">{data.summary.total_employees}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{data.summary.on_track}</p>
          <p className="text-xs text-green-600">On Track</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">{data.summary.behind}</p>
          <p className="text-xs text-yellow-600">Behind</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{data.summary.overtime}</p>
          <p className="text-xs text-red-600">Overtime</p>
        </div>
      </div>

      {/* Team List */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {data.team_progress.map((employee, index) => {
          const config = statusConfig[employee.status] || statusConfig.ON_TRACK;
          const StatusIcon = config.icon;
          
          return (
            <motion.div
              key={employee.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"
            >
              {/* Employee Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-brand-dark truncate">{employee.user_name}</p>
                <p className="text-xs text-gray-500 truncate">{employee.user_email}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-32 hidden sm:block">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${config.barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(employee.progress_percent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Hours */}
              <div className="text-right w-20">
                <p className="font-semibold text-brand-dark">
                  {employee.total_hours}h
                  <span className="text-gray-400 font-normal"> / {employee.goal_hours}h</span>
                </p>
              </div>

              {/* Status */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${config.bgColor}`}>
                <StatusIcon className={`w-3 h-3 ${config.color}`} />
                <span className={`text-xs font-medium ${config.color} hidden md:inline`}>
                  {Math.round(employee.progress_percent)}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminTeamProgressSection;
