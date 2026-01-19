import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Hash, Lock } from 'lucide-react';

const CreateChannelModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Channel name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onCreate({
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        description: description.trim(),
        type: isPrivate ? 'PRIVATE' : 'PUBLIC'
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl w-full max-w-sm shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Create Channel</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-gray-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Channel name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                #
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. general"
                className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black"
                maxLength={30}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Lowercase letters, numbers, and dashes only
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              rows={2}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg resize-none
                       focus:outline-none focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black"
              maxLength={200}
            />
          </div>

          {/* Privacy toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {isPrivate ? (
                <Lock className="w-5 h-5 text-gray-500" />
              ) : (
                <Hash className="w-5 h-5 text-gray-500" />
              )}
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {isPrivate ? 'Private Channel' : 'Public Channel'}
                </p>
                <p className="text-xs text-gray-500">
                  {isPrivate 
                    ? 'Only invited members can access' 
                    : 'Anyone in the team can join'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-10 h-6 rounded-full transition-colors ${
                isPrivate ? 'bg-brand-black' : 'bg-gray-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${
                isPrivate ? 'translate-x-4' : ''
              }`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg
                       hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 bg-brand-black text-white rounded-lg
                       hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CreateChannelModal;
