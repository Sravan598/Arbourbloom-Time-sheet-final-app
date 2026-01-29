import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
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
  PieChart,
  Download,
  User,
  Settings
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { Button } from '../../components/ui/Button';
import AdminSidebar from '../../components/admin/AdminSidebar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PerformanceInsights = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { tenant, getTenantName } = useTenant();
  const profileDropdownRef = useRef(null);
  
  const [period, setPeriod] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [performers, setPerformers] = useState(null);
  const [leaveAnalysis, setLeaveAnalysis] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profileData, setProfileData] = useState(null);

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

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const response = await axios.get(`${API}/admin/performance/export-pdf?days=${period}`, {
        responseType: 'blob'
      });
      
      // Create download link with tenant name
      const tenantName = getTenantName().replace(/\s+/g, '_');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${tenantName}_Performance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const MetricCard = ({ title, value, unit, change, icon: Icon, color }) => {
    const isPositive = change > 0;
    const isNeutral = change === 0;
    
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      red: 'bg-red-100 text-gray-700',
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
            <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-gray-700'}`}>
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
          <div className="w-12 h-12 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-black to-brand-black-dark rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-brand-dark">Performance Insights</h1>
                  <p className="text-sm text-gray-500">Analytics & Trends</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Period Selector */}
                <div className="relative">
                  <select
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value))}
                    className="appearance-none bg-gray-100 border-0 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-brand-dark focus:ring-2 focus:ring-brand-black"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                
                {/* Export PDF Button */}
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={handleExportPDF}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {isExporting ? 'Exporting...' : 'Export PDF'}
                </Button>
                
                {/* Profile Dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-2 hover:bg-gray-100 rounded-full py-1 pl-1 pr-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border-2 border-purple-200">
                      {profileData?.profile_image ? (
                        <img 
                          src={profileData.profile_image} 
                          alt={profileData?.name || user?.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700">
                          <span className="text-sm font-bold text-white">
                            {(profileData?.name || user?.name)?.charAt(0)?.toUpperCase() || 'A'}
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
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">Admin</span>
                          </div>
                          <p className="font-semibold text-brand-dark mt-1">{profileData?.name || user?.name}</p>
                          <p className="text-sm text-gray-500 truncate">{profileData?.email || user?.email}</p>
                        </div>
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
                        <div className="border-t border-gray-100 pt-1">
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              handleLogout();
                            }}
                            className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-red-50 transition-colors w-full"
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
          </div>
        </header>

        <main className="p-8">
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
                  <AlertCircle className="w-5 h-5 text-gray-700" />
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
                        <AlertTriangle className="w-4 h-4 text-gray-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-brand-dark truncate">{performer.name}</p>
                        <p className="text-xs text-gray-500">{performer.total_hours}h / {performers.target_hours}h target</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-700">
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
    </div>
  );
};

export default PerformanceInsights;
