import { useState } from 'react';
import { EMOJI_GROUPS } from '../utils/emojiGroups';

const CATEGORY_ICONS = {
  frequent: '⏱️',
  smileys: '😊',
  animals: '🐱',
  food: '🍕',
  activities: '⚽',
  objects: '💡',
  symbols: '🔣'
};

export default function ChatEmojiPicker({ onEmojiSelect }) {
  const [activeCategory, setActiveCategory] = useState(EMOJI_GROUPS[0]?.id || 'smileys');
  const activeGroup = EMOJI_GROUPS.find(g => g.id === activeCategory) || EMOJI_GROUPS[0];

  return (
    <div className="chat-emoji-picker-full">
      <div className="emoji-category-tabs">
        {EMOJI_GROUPS.map(group => (
          <button
            key={group.id}
            type="button"
            className={`emoji-category-tab ${activeCategory === group.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(group.id)}
            title={group.label}
          >
            {CATEGORY_ICONS[group.id] || '❓'}
          </button>
        ))}
      </div>
      <div className="emoji-picker-content">
        <div className="emoji-category-title">{activeGroup.label}</div>
        <div className="emoji-grid">
          {activeGroup.emojis.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => onEmojiSelect(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
