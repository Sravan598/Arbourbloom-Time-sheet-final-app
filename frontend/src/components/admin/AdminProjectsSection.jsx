import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderKanban, 
  Plus, 
  X, 
  Edit2,
  Trash2,
  Users,
  Clock,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { Button } from '../../components/ui/Button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const projectColors = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'
];

const AdminProjectsSection = () => {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#EF4444',
    estimated_hours: '',
    assigned_users: []
  });
  const [formError, setFormError] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, usersRes] = await Promise.all([
        axios.get(`${API}/projects`),
        axios.get(`${API}/admin/users`)
      ]);
      setProjects(projectsRes.data);
      setEmployees(usersRes.data.filter(u => u.role === 'EMPLOYEE'));
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setProcessing(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        color: formData.color,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        assigned_users: formData.assigned_users
      };

      if (editingProject) {
        await axios.put(`${API}/projects/${editingProject.id}`, payload);
      } else {
        await axios.post(`${API}/projects`, payload);
      }
      
      setShowModal(false);
      setEditingProject(null);
      setFormData({ name: '', description: '', color: '#EF4444', estimated_hours: '', assigned_users: [] });
      await fetchData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save project');
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color,
      estimated_hours: project.estimated_hours?.toString() || '',
      assigned_users: project.assigned_users || []
    });
    setShowModal(true);
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to archive this project?')) return;
    
    try {
      await axios.delete(`${API}/projects/${projectId}`);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete project');
    }
  };

  const formatMinutes = (minutes) => {
    if (!minutes) return '0h';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const toggleUserAssignment = (userId) => {
    setFormData(prev => ({
      ...prev,
      assigned_users: prev.assigned_users.includes(userId)
        ? prev.assigned_users.filter(id => id !== userId)
        : [...prev.assigned_users, userId]
    }));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        </div>
      </div>
    );
  }

  const activeProjects = projects.filter(p => p.status === 'ACTIVE');

  return (
    <>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FolderKanban className="w-6 h-6 text-brand-black" />
            <h2 className="text-lg font-bold text-brand-dark">Projects</h2>
          </div>
          <Button
            onClick={() => {
              setEditingProject(null);
              setFormData({ name: '', description: '', color: '#EF4444', estimated_hours: '', assigned_users: [] });
              setShowModal(true);
            }}
            variant="primary"
            size="sm"
            data-testid="create-project-btn"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Project
          </Button>
        </div>

        {/* Projects List */}
        {activeProjects.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No projects yet</p>
            <p className="text-gray-400 text-sm">Create your first project to start tracking time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <div>
                    <p className="font-semibold text-brand-dark">{project.name}</p>
                    {project.description && (
                      <p className="text-sm text-gray-500 line-clamp-1">{project.description}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatMinutes(project.total_logged_minutes)}</span>
                      {project.estimated_hours && (
                        <span className="text-gray-400">/ {project.estimated_hours}h</span>
                      )}
                    </div>
                    {project.assigned_users?.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{project.assigned_users.length}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(project)}
                      className="p-2 text-gray-400 hover:text-brand-black rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-brand-dark">
                  {editingProject ? 'Edit Project' : 'New Project'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-gray-800 text-sm">{formError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent"
                    placeholder="e.g., Website Redesign"
                    required
                    data-testid="project-name-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent resize-none"
                    rows={2}
                    placeholder="Brief project description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">
                    Color
                  </label>
                  <div className="flex gap-2">
                    {projectColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-black focus:border-transparent"
                    placeholder="e.g., 40"
                    min="0"
                    step="0.5"
                  />
                </div>

                {employees.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-brand-dark mb-2">
                      Assign Employees
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-2">
                      {employees.map((emp) => (
                        <label
                          key={emp.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.assigned_users.includes(emp.id)}
                            onChange={() => toggleUserAssignment(emp.id)}
                            className="w-4 h-4 text-brand-black rounded focus:ring-brand-black"
                          />
                          <span className="text-sm text-brand-dark">{emp.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to make available to all employees
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={processing}
                    data-testid="save-project-btn"
                  >
                    {processing ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      editingProject ? 'Save Changes' : 'Create Project'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminProjectsSection;
