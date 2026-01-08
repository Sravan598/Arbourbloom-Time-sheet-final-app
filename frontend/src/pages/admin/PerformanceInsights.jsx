import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  LogOut,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Coffee,
  AlertTriangle,
  Calendar,
  Award,
  AlertCircle,
  ChevronDown,
  BarChart3,
  PieChart
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PerformanceInsights = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const [period, setPeriod] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [performers, setPerformers] = useState(null);
  const [leaveAnalysis, setLeaveAnalysis] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewRes, trendsRes, patternsRes, performersRes, leaveRes] = await Promise.all([
        axios.get(`${API}/admin/performance/overview?days=${period}`),
        axios.get(`${API}/admin/performance/weekly-trends?weeks=8`),
        axios.get(`${API}/admin/performance/attendance-patterns?days=${period}`),
        axios.get(`${API}/admin/performance/top-performers?days=${period}`),
        axios.get(`${API}/admin/performance/leave-analysis?days=${period}`)
      ]);
      
      setOverview(overviewRes.data);
      setTrends(trendsRes.data);
      setPatterns(patternsRes.data);
      setPerformers(performersRes.data);
      setLeaveAnalysis(leaveRes.data);
    } catch (err) {
      console.error('Failed to fetch performance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const MetricCard = ({ title, value, unit, change, icon: Icon, color }) => {
    const isPositive = change > 0;
    const isNeutral = change === 0;
    
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      red: 'bg-red-100 text-red-600',
      purple: 'bg-purple-100 text-purple-600'
    };
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          {!isNeutral && (
            <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(change)}{unit === '%' ? '%' : unit === 'h' ? 'h' : ' min'}
            </div>
          )}
        </div>
        <h3 className="text-3xl font-bold text-brand-dark">
          {value}{unit}
        </h3>
        <p className="text-gray-500 mt-1">{title}</p>
      </motion.div>
    );
  };

  const ProgressBar = ({ percentage, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500'
    };
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                to="/admin/dashboard"
                className="p-2 text-gray-500 hover:text-brand-dark hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-red to-brand-red-dark rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-brand-dark">Performance Insights</h1>
                  <p className="text-sm text-gray-500">Analytics & Trends</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Period Selector */}
              <div className="relative">
                <select
                  value={period}
                  onChange={(e) => setPeriod(Number(e.target.value))}
                  className="appearance-none bg-gray-100 border-0 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-brand-dark focus:ring-2 focus:ring-brand-red"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Metrics */}
        {overview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Attendance Rate"
              value={overview.attendance_rate}
              unit="%"
              change={overview.attendance_change}
              icon={Users}
              color="blue"
            />
            <MetricCard
              title="Avg Hours/Day"
              value={overview.avg_hours_per_day}
              unit="h"
              change={overview.avg_hours_change}
              icon={Clock}
              color="green"
            />
            <MetricCard
              title="Avg Break Time"
              value={overview.avg_break_minutes}
              unit=" min"
              change={overview.avg_break_change}
              icon={Coffee}
              color="yellow"
            />
            <MetricCard
              title="Overtime Rate"
              value={overview.overtime_rate}
              unit="%"
              change={-overview.overtime_change}
              icon={AlertTriangle}
              color="red"
            />
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Weekly Trends Chart */}
          {trends && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">Weekly Hours Trend</h2>
                  <p className="text-sm text-gray-500">Average hours per employee</p>
                </div>
              </div>
              
              <div className="h-48 flex items-end justify-between gap-2">
                {trends.trends.map((week, index) => {
                  const maxHours = Math.max(...trends.trends.map(w => w.avg_hours), 45);
                  const heightPercent = (week.avg_hours / maxHours) * 100;
                  const isAboveTarget = week.avg_hours >= trends.target_hours;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="relative w-full flex flex-col items-center">
                        <span className="text-xs text-gray-500 mb-1">{week.avg_hours}h</span>
                        <div 
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            isAboveTarget ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ height: `${heightPercent * 1.5}px`, minHeight: '20px' }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 mt-2">{week.week}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Target line indicator */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span className="text-xs text-gray-500">Below 40h</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span className="text-xs text-gray-500">At/Above 40h</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Attendance Patterns */}
          {patterns && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">Attendance Patterns</h2>
                  <p className="text-sm text-gray-500">Clock-in time distribution</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {patterns.clock_in_distribution.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium text-brand-dark">{item.percentage}%</span>
                    </div>
                    <ProgressBar 
                      percentage={item.percentage} 
                      color={index === 0 ? 'green' : index === 1 ? 'blue' : 'yellow'} 
                    />
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Busiest Days:</span>
                  <span className="font-medium text-brand-dark">
                    {patterns.busiest_days.map(d => d.day.slice(0, 3)).join(' → ')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-500">Quietest Day:</span>
                  <span className="font-medium text-brand-dark">{patterns.quietest_day.day}</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Top Performers */}
          {performers && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Award className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">Top Performers</h2>
                  <p className="text-sm text-gray-500">Based on hours worked</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {performers.top_performers.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                ) : (
                  performers.top_performers.map((performer, index) => (
                    <div 
                      key={performer.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-100 text-yellow-600' :
                        index === 1 ? 'bg-gray-200 text-gray-600' :
                        index === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-brand-dark truncate">{performer.name}</p>
                        <p className="text-xs text-gray-500">{performer.total_hours}h worked</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${
                          performer.percentage >= 100 ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {performer.percentage}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* Needs Attention */}
          {performers && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-brand-dark">Needs Attention</h2>
                  <p className="text-sm text-gray-500">Below 90% of target hours</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {performers.needs_attention.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-gray-600 font-medium">All employees on track!</p>
                    <p className="text-sm text-gray-400">No one needs attention right now</p>
                  </div>
                ) : (
                  performers.needs_attention.map((performer) => (
                    <div 
                      key={performer.id}
                      className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100"
                    >
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-brand-dark truncate">{performer.name}</p>
                        <p className="text-xs text-gray-500">{performer.total_hours}h / {performers.target_hours}h target</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-red-600">
                          {performer.percentage}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Leave Analysis */}
        {leaveAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-brand-dark">Leave & Absence Analysis</h2>
                <p className="text-sm text-gray-500">{leaveAnalysis.total_leaves} leave requests in this period</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Leave Usage by Type */}
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-4">Leave Usage by Type</h3>
                <div className="space-y-3">
                  {leaveAnalysis.leave_usage.map((item, index) => {
                    const colors = ['bg-blue-500', 'bg-red-500', 'bg-purple-500', 'bg-gray-500'];
                    return (
                      <div key={index}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{item.type}</span>
                          <span className="font-medium text-brand-dark">{item.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${colors[index]} transition-all duration-500`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Summary Stats */}
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-4">PTO Utilization</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Overall Utilization</span>
                      <span className="text-2xl font-bold text-brand-dark">{leaveAnalysis.utilization_rate}%</span>
                    </div>
                    <ProgressBar percentage={leaveAnalysis.utilization_rate} color="blue" />
                  </div>
                  
                  {leaveAnalysis.employees_with_high_balance > 0 && (
                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-yellow-800">
                            {leaveAnalysis.employees_with_high_balance} employees
                          </p>
                          <p className="text-sm text-yellow-600">
                            have &gt;80% unused PTO - consider encouraging time off
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default PerformanceInsights;
