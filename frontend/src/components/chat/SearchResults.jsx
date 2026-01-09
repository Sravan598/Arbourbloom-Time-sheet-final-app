import React from 'react';
import { motion } from 'framer-motion';
import { Hash, User, Search } from 'lucide-react';
import { format } from 'date-fns';

const SearchResults = ({ results, loading, onResultClick }) => {
  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-gray-500 mt-2">Searching...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-4 text-center">
        <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No messages found</p>
      </div>
    );
  }

  // Highlight search query in text
  const highlightText = (text, maxLength = 100) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  return (
    <div className="max-h-64 overflow-y-auto">
      {results.map((result, index) => (
        <motion.button
          key={result.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onResultClick(result)}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 
                     last:border-b-0 transition-colors"
        >
          <div className="flex items-start gap-3">
            {/* Context icon */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              result.context_type === 'channel' 
                ? 'bg-blue-100 text-blue-600'
                : 'bg-purple-100 text-purple-600'
            }`}>
              {result.context_type === 'channel' ? (
                <Hash className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Context and sender */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-500">
                  {result.context}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400">
                  {result.sender_name}
                </span>
              </div>
              
              {/* Message content */}
              <p className="text-sm text-gray-900 truncate">
                {highlightText(result.content)}
              </p>
              
              {/* Timestamp */}
              <p className="text-xs text-gray-400 mt-1">
                {format(new Date(result.created_at), 'MMM d, h:mm a')}
              </p>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
};

export default SearchResults;
