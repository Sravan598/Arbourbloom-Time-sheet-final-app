import React from 'react';
import { motion } from 'framer-motion';

const MessageReactions = ({ reactions, onReactionClick, currentUserId }) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((reaction, idx) => {
        const hasReacted = reaction.users?.some(u => u.id === currentUserId);
        const userNames = reaction.users?.map(u => u.name).join(', ');
        
        return (
          <motion.button
            key={idx}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onReactionClick(reaction.emoji)}
            title={userNames}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
              hasReacted
                ? 'bg-brand-black/10 text-brand-black border border-brand-black/20'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
            }`}
          >
            <span>{reaction.emoji}</span>
            {reaction.count > 1 && (
              <span className="font-medium">{reaction.count}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default MessageReactions;
