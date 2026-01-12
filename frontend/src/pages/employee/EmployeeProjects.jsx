import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderKanban, 
  Play, 
  Square, 
  Clock,
  ChevronDown,
  Timer,
  User,
  ChevronRight,
  Calendar,
  Target,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import EmployeeSidebar from '../../components/employee/EmployeeSidebar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EmployeeProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [todayEntries, setTodayEntries] = useState([]);
  const [timeSummary, setTimeSummary] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [description, setDescription] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [expandedProject, setExpandedProject] = useState(null);
  const timerRef = useRef(null);
  const dropdownRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, activeRes, todayRes, summaryRes] = await Promise.all([
        axios.get(`${API}/projects`),
        axios.get(`${API}/time-entries/active`),
        axios.get(`${API}/time-entries/today`),
        axios.get(`${API}/time-entries/summary?days=7`)
      ]);
      
      setProjects(projectsRes.data);
      setTodayEntries(todayRes.data);
      setTimeSummary(summaryRes.data);
      
      if (activeRes.data.is_tracking && activeRes.data.entry) {
        setIsTracking(true);
        setActiveEntry(activeRes.data.entry);
        setSelectedProject(activeRes.data.entry.project_id);
      } else {
        setIsTracking(false);
        setActiveEntry(null);
      }
    } catch (err) {
      console.error('Failed to fetch project data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Timer effect
  useEffect(() => {
    if (isTracking && activeEntry?.start_time) {
      const startTime = new Date(activeEntry.start_time);
      timerRef.current = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now - startTime) / 1000);
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
  }, [isTracking, activeEntry]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartTracking = async () => {
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }
    
    setProcessing(true);
    try {
      await axios.post(`${API}/time-entries/start`, {
        project_id: selectedProject,
        description: description || null
      });
      setDescription('');
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to start tracking');
    } finally {
      setProcessing(false);
    }
  };

  const handleStopTracking = async () => {
    setProcessing(true);
    try {
      await axios.post(`${API}/time-entries/stop`);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to stop tracking');
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
    if (!minutes) return '0h';
    if (minutes < 60) return `${minutes}m`;
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSelectedProjectName = () => {
    const project = projects.find(p => p.id === selectedProject);
    return project?.name || 'Select Project';
  };

  const getSelectedProjectColor = () => {
    const project = projects.find(p => p.id === selectedProject);
    return project?.color || '#6B7280';
  };

  const getProjectTimeLogged = (projectId) => {
    const summary = timeSummary.find(s => s.project_id === projectId);
    return summary?.total_minutes || 0;
  };

  const activeProjects = projects.filter(p => p.status === 'ACTIVE');
  const completedProjects = projects.filter(p => p.status === 'COMPLETED');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <EmployeeSidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <EmployeeSidebar />
      
      <div className="flex-1 ml-64">
        <main className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-brand-dark">My Projects</h1>
            <p className="text-gray-500 mt-1">View assigned projects and track your time</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Project List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Projects */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderKanban className="w-5 h-5 text-brand-red" />
                    <h2 className="font-semibold text-brand-dark">Active Projects</h2>
                  </div>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    {activeProjects.length} active
                  </span>
                </div>

                {activeProjects.length === 0 ? (
                  <div className="p-8 text-center">
                    <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No projects assigned to you yet</p>
                    <p className="text-sm text-gray-400 mt-1">Contact your admin to get assigned to projects</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {activeProjects.map((project) => {
                      const timeLogged = getProjectTimeLogged(project.id);
                      const progress = project.estimated_hours 
                        ? Math.min((timeLogged / 60 / project.estimated_hours) * 100, 100)
                        : 0;
                      const isExpanded = expandedProject === project.id;

                      return (
                        <motion.div
                          key={project.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <button
                            onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                            className="w-full px-6 py-4 flex items-center justify-between text-left"
                            data-testid={`project-item-${project.id}`}
                          >
                            <div className="flex items-center gap-4">
                              <div 
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: project.color }}
                              />
                              <div>
                                <h3 className="font-medium text-brand-dark">{project.name}</h3>
                                {project.description && (
                                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{project.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-700">{formatMinutes(timeLogged)}</p>
                                <p className="text-xs text-gray-400">logged this week</p>
                              </div>
                              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </div>
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-6 pb-4 space-y-4">
                                  {/* Project Details */}
                                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-6 text-sm">
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <Calendar className="w-4 h-4" />
                                        <span>Created {formatDate(project.created_at)}</span>
                                      </div>
                                      {project.estimated_hours && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                          <Target className="w-4 h-4" />
                                          <span>Est. {project.estimated_hours}h</span>
                                        </div>
                                      )}
                                    </div>

                                    {project.estimated_hours && (
                                      <div>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                          <span className="text-gray-600">Progress</span>
                                          <span className="font-medium" style={{ color: project.color }}>
                                            {Math.round(progress)}%
                                          </span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: project.color }}
                                          />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                          {formatMinutes(timeLogged)} of {project.estimated_hours}h logged
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Quick Track Button */}
                                  {!isTracking && (
                                    <Button
                                      onClick={() => {
                                        setSelectedProject(project.id);
                                        handleStartTracking();
                                      }}
                                      variant="primary"
                                      size="sm"
                                      className="w-full"
                                      style={{ backgroundColor: project.color }}
                                      disabled={processing}
                                    >
                                      <Play className="w-4 h-4 mr-2" />
                                      Start Tracking This Project
                                    </Button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Completed Projects */}
              {completedProjects.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderKanban className="w-5 h-5 text-gray-400" />
                      <h2 className="font-semibold text-gray-500">Completed Projects</h2>
                    </div>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                      {completedProjects.length} completed
                    </span>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {completedProjects.map((project) => (
                      <div key={project.id} className="px-6 py-4 flex items-center justify-between opacity-60">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: project.color }}
                          />
                          <div>
                            <h3 className="font-medium text-gray-600">{project.name}</h3>
                          </div>
                        </div>
                        <span className="text-sm text-gray-400">
                          {formatMinutes(project.total_logged_minutes || 0)} total
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column - Time Tracking */}
            <div className="space-y-6">
              {/* Time Tracker Widget */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Timer className="w-5 h-5 text-brand-red" />
                  <h2 className="font-semibold text-brand-dark">Time Tracker</h2>
                </div>

                <AnimatePresence mode="wait">
                  {isTracking && activeEntry ? (
                    <motion.div
                      key="tracking"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="rounded-xl p-4 border-2"
                      style={{ 
                        backgroundColor: `${activeEntry.project_color}10`,
                        borderColor: `${activeEntry.project_color}40`
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: activeEntry.project_color }}
                          />
                          <span className="text-sm font-medium" style={{ color: activeEntry.project_color }}>
                            Tracking
                          </span>
                        </div>
                        <span 
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ 
                            backgroundColor: `${activeEntry.project_color}20`,
                            color: activeEntry.project_color
                          }}
                        >
                          {activeEntry.project_name}
                        </span>
                      </div>
                      
                      <div className="text-center mb-4">
                        <div className="text-3xl font-bold font-mono" style={{ color: activeEntry.project_color }}>
                          {formatTime(elapsedTime)}
                        </div>
                        {activeEntry.description && (
                          <p className="text-xs text-gray-500 mt-1">{activeEntry.description}</p>
                        )}
                      </div>
                      
                      <Button
                        onClick={handleStopTracking}
                        variant="primary"
                        className="w-full"
                        style={{ backgroundColor: activeEntry.project_color }}
                        disabled={processing}
                        data-testid="stop-tracking-btn"
                      >
                        {processing ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Square className="w-4 h-4 mr-2" />
                            Stop
                          </>
                        )}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="not-tracking"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="space-y-3"
                    >
                      {/* Project Selector */}
                      <div className="relative" ref={dropdownRef}>
                        <button
                          onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                          data-testid="project-selector"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getSelectedProjectColor() }}
                            />
                            <span className={selectedProject ? 'text-brand-dark font-medium text-sm' : 'text-gray-400 text-sm'}>
                              {getSelectedProjectName()}
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {showProjectDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden max-h-48 overflow-y-auto"
                            >
                              {activeProjects.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                  No projects available
                                </div>
                              ) : (
                                activeProjects.map((project) => (
                                  <button
                                    key={project.id}
                                    onClick={() => {
                                      setSelectedProject(project.id);
                                      setShowProjectDropdown(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                                      selectedProject === project.id ? 'bg-gray-50' : ''
                                    }`}
                                  >
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: project.color }}
                                    />
                                    <span className="text-sm font-medium text-brand-dark">{project.name}</span>
                                  </button>
                                ))
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Description Input */}
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What are you working on?"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-red focus:border-transparent"
                        data-testid="task-description"
                      />

                      {/* Start Button */}
                      <Button
                        onClick={handleStartTracking}
                        variant="primary"
                        className="w-full"
                        disabled={!selectedProject || processing}
                        data-testid="start-tracking-btn"
                      >
                        {processing ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start Tracking
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Weekly Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-5 h-5 text-brand-red" />
                  <h2 className="font-semibold text-brand-dark">This Week</h2>
                </div>

                {timeSummary.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-xl">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No time logged this week</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {timeSummary.map((summary) => (
                      <div
                        key={summary.project_id}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ backgroundColor: `${summary.project_color}10` }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: summary.project_color }}
                          />
                          <span className="text-sm font-medium text-brand-dark">{summary.project_name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">
                          {formatMinutes(summary.total_minutes)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Today's Entries */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-brand-red" />
                    <h2 className="font-semibold text-brand-dark">Today</h2>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatMinutes(todayEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0))}
                  </span>
                </div>
                
                {todayEntries.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-xl">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No entries today</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {todayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ backgroundColor: `${entry.project_color}10` }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.project_color }}
                          />
                          <div>
                            <p className="text-sm font-medium text-brand-dark">{entry.project_name}</p>
                            <p className="text-xs text-gray-500">
                              {formatTimeShort(entry.start_time)}
                              {entry.end_time && ` - ${formatTimeShort(entry.end_time)}`}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {entry.duration_minutes ? formatMinutes(entry.duration_minutes) : 'In progress'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeProjects;
