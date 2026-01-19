import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderKanban, 
  Play, 
  Square, 
  Clock,
  ChevronDown,
  Timer
} from 'lucide-react';
import axios from 'axios';
import { Button } from '../../components/ui/Button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProjectTrackingSection = () => {
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
      
      setProjects(projectsRes.data.filter(p => p.status === 'ACTIVE'));
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
    if (!minutes) return '0m';
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

  const getSelectedProjectName = () => {
    const project = projects.find(p => p.id === selectedProject);
    return project?.name || 'Select Project';
  };

  const getSelectedProjectColor = () => {
    const project = projects.find(p => p.id === selectedProject);
    return project?.color || '#6B7280';
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
      transition={{ delay: 0.4 }}
      className="bg-white rounded-3xl shadow-lg p-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FolderKanban className="w-6 h-6 text-brand-black" />
        <h2 className="text-xl font-bold text-brand-dark">Project Time Tracking</h2>
      </div>

      {/* Timer Section */}
      <div className="mb-6">
        <AnimatePresence mode="wait">
          {isTracking && activeEntry ? (
            <motion.div
              key="tracking"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-6 border-2"
              style={{ 
                backgroundColor: `${activeEntry.project_color}10`,
                borderColor: `${activeEntry.project_color}40`
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: activeEntry.project_color }}
                  />
                  <span className="font-medium" style={{ color: activeEntry.project_color }}>
                    Tracking Time
                  </span>
                </div>
                <div 
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: `${activeEntry.project_color}20`,
                    color: activeEntry.project_color
                  }}
                >
                  {activeEntry.project_name}
                </div>
              </div>
              
              <div className="text-center mb-4">
                <div className="text-4xl font-bold font-mono" style={{ color: activeEntry.project_color }}>
                  {formatTime(elapsedTime)}
                </div>
                {activeEntry.description && (
                  <p className="text-sm text-gray-500 mt-1">{activeEntry.description}</p>
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
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Stop Tracking
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
              className="space-y-4"
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
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getSelectedProjectColor() }}
                    />
                    <span className={selectedProject ? 'text-brand-dark font-medium' : 'text-gray-400'}>
                      {getSelectedProjectName()}
                    </span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showProjectDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
                    >
                      {projects.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No projects available
                        </div>
                      ) : (
                        projects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => {
                              setSelectedProject(project.id);
                              setShowProjectDropdown(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                              selectedProject === project.id ? 'bg-gray-50' : ''
                            }`}
                          >
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                            <span className="font-medium text-brand-dark">{project.name}</span>
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
                placeholder="What are you working on? (optional)"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent"
                data-testid="task-description"
              />

              {/* Start Button */}
              <Button
                onClick={handleStartTracking}
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!selectedProject || processing}
                data-testid="start-tracking-btn"
              >
                {processing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Tracking
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Weekly Summary */}
      {timeSummary.length > 0 && (
        <div className="border-t border-gray-100 pt-6 mb-6">
          <h3 className="font-semibold text-brand-dark mb-3">This Week</h3>
          <div className="space-y-2">
            {timeSummary.slice(0, 4).map((summary) => (
              <div
                key={summary.project_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
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
        </div>
      )}

      {/* Today's Entries */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-brand-dark">Today's Entries</h3>
          <div className="flex items-center gap-2 text-sm">
            <Timer className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              {formatMinutes(todayEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0))}
            </span>
          </div>
        </div>
        
        {todayEntries.length === 0 ? (
          <div className="text-center py-4 bg-gray-50 rounded-xl">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No time entries today</p>
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
                    className="w-3 h-3 rounded-full"
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
                <span className="text-sm font-semibold text-gray-700">
                  {entry.duration_minutes ? formatMinutes(entry.duration_minutes) : 'In progress'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProjectTrackingSection;
