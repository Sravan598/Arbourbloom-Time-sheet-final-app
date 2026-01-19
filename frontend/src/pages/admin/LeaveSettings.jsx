import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Plus, Edit2, Trash2, X, Save, AlertCircle, Info
} from 'lucide-react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import leaveService from '../../services/leaveService';

// Common emoji options for leave types
const EMOJI_OPTIONS = ['🏖️', '🤒', '👤', '🖤', '👶', '📅', '✈️', '🏠', '💼', '🎓', '⚕️', '🌴'];

const LeaveSettings = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({ name: '', icon: '📅' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch leave types
  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await leaveService.getLeaveTypes();
      setLeaveTypes(data);
    } catch (error) {
      console.error('Error fetching types:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  // Handle create/update
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingType) {
        await leaveService.updateLeaveType(editingType.id, formData);
      } else {
        await leaveService.createLeaveType(formData);
      }
      setShowModal(false);
      setEditingType(null);
      setFormData({ name: '', icon: '📅' });
      fetchTypes();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to save leave type');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (typeId) => {
    if (!window.confirm('Are you sure you want to delete this leave type?')) return;
    
    try {
      await leaveService.deleteLeaveType(typeId);
      fetchTypes();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to delete leave type');
    }
  };

  // Open edit modal
  const openEditModal = (type) => {
    setEditingType(type);
    setFormData({ name: type.name, icon: type.icon });
    setShowModal(true);
  };

  // Open create modal
  const openCreateModal = () => {
    setEditingType(null);
    setFormData({ name: '', icon: '📅' });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      
      <main className="flex-1 p-6 lg:p-8 ml-64">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leave Settings</h1>
              <p className="text-gray-500 mt-1">Manage default leave types for your organization</p>
            </div>
            <motion.button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-brand-black text-white rounded-lg
                         hover:bg-gray-700 transition-colors font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-5 h-5" />
              Add Type
            </motion.button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-900 text-sm">
                  <strong>Default leave types</strong> appear in the dropdown when employees request leave.
                  Employees can also enter custom leave types if needed.
                </p>
              </div>
            </div>
          </div>

          {/* Leave Types List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Default Leave Types</h2>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-3 border-brand-black border-t-transparent rounded-full mx-auto" />
              </div>
            ) : leaveTypes.length === 0 ? (
              <div className="p-8 text-center">
                <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No leave types configured</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {leaveTypes.map((type, index) => (
                  <motion.div
                    key={type.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{type.icon}</span>
                      <span className="font-medium text-gray-900">{type.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(type)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(type.id)}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingType ? 'Edit Leave Type' : 'Add Leave Type'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-gray-800 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Icon Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: emoji })}
                        className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center
                                   transition-all ${
                                     formData.icon === emoji
                                       ? 'bg-brand-black/10 ring-2 ring-brand-black'
                                       : 'bg-gray-100 hover:bg-gray-200'
                                   }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Vacation, Sick Leave"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black"
                    required
                  />
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Preview</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{formData.icon}</span>
                    <span className="font-medium text-gray-900">
                      {formData.name || 'Leave Type Name'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg
                               hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formData.name}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-black text-white rounded-lg
                               hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeaveSettings;
