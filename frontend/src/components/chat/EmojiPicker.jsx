import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏', '💯', '✅'];
const FULL_EMOJI_SET = [
  ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂'],
  ['😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛'],
  ['😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨'],
  ['😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔'],
  ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘'],
  ['👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦵', '🦶'],
  ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔'],
  ['💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '🔥'],
  ['✅', '❌', '❓', '❗', '💤', '🎉', '🎊', '🎈', '🎁', '⭐']
];

const EmojiPicker = ({ onSelect, onClose, compact = false }) => {
  const ref = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (compact) {
    // Quick reaction picker
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-full shadow-lg border border-gray-200 p-1 flex items-center gap-0.5"
      >
        {COMMON_EMOJIS.slice(0, 6).map((emoji, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(emoji)}
            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="text-base">{emoji}</span>
          </button>
        ))}
      </motion.div>
    );
  }

  // Full emoji picker
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-72"
    >
      {/* Quick access row */}
      <div className="flex items-center gap-1 pb-2 mb-2 border-b border-gray-100">
        {COMMON_EMOJIS.map((emoji, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(emoji)}
            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
          >
            <span className="text-lg">{emoji}</span>
          </button>
        ))}
      </div>

      {/* Full emoji grid */}
      <div className="max-h-48 overflow-y-auto">
        {FULL_EMOJI_SET.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-1 mb-1">
            {row.map((emoji, emojiIdx) => (
              <button
                key={emojiIdx}
                onClick={() => onSelect(emoji)}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
              >
                <span className="text-lg">{emoji}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default EmojiPicker;
