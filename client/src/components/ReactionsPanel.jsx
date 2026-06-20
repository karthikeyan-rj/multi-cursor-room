import { EMOJIS } from '../constants';

export default function ReactionsPanel({ onSendReaction }) {
  return (
    <div className="reactions-float-panel glass">
      {EMOJIS.map(emoji => (
        <button key={emoji} className="reaction-btn" onClick={() => onSendReaction(emoji)}>
          {emoji}
        </button>
      ))}
    </div>
  );
}
