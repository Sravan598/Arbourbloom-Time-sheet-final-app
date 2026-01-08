import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Lock, Plus, Users, ChevronDown, ChevronRight } from 'lucide-react';

const ChannelList = ({ 
  channels, 
  selectedChannel, 
  onSelectChannel, 
  onCreateChannel,
  loading 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const defaultChannels = channels.filter(c => c.is_default);
  const userChannels = channels.filter(c => !c.is_default);

  const ChannelItem = ({ channel }) => {
    const isSelected = selectedChannel?.id === channel.id;
    
    return (
      <motion.button
        onClick={() => onSelectChannel(channel)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left text-sm
                    transition-colors group ${
                      isSelected 
                        ? 'bg-brand-red/10 text-brand-red font-medium' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
      >
        {channel.type === 'PRIVATE' ? (
          <Lock className="w-4 h-4 opacity-60" />
        ) : (
          <Hash className="w-4 h-4 opacity-60" />
        )}
        <span className="truncate flex-1">{channel.name}</span>
        {channel.unread_count > 0 && (
          <span className="bg-brand-red text-white text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[20px] text-center">
            {channel.unread_count > 99 ? '99+' : channel.unread_count}
          </span>
        )}
      </motion.button>
    );
  };

  return (
    <div className="py-2">
      {/* Channels header */}
      <div className="px-3 mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider
                     hover:text-gray-700 transition-colors w-full"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          Channels
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Default channels */}
            <div className="px-2 space-y-0.5">
              {defaultChannels.map(channel => (
                <ChannelItem key={channel.id} channel={channel} />
              ))}
            </div>

            {/* User channels */}
            {userChannels.length > 0 && (
              <div className="px-2 mt-2 pt-2 border-t border-gray-100 space-y-0.5">
                {userChannels.map(channel => (
                  <ChannelItem key={channel.id} channel={channel} />
                ))}
              </div>
            )}

            {/* Create channel button */}
            <div className="px-2 mt-2">
              <button
                onClick={onCreateChannel}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500
                           hover:bg-gray-100 hover:text-gray-700 rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Channel</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="px-3 py-2">
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelList;
