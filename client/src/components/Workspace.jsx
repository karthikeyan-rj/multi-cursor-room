import TopNav from './TopNav';
import FloatingToolbar from './FloatingToolbar';
import ChatDrawer from './ChatDrawer';
import ReactionsPanel from './ReactionsPanel';
import StickyNote from './StickyNote';
import RemoteCursorOverlay from './RemoteCursorOverlay';
import CursorTrail from './CursorTrail';

export default function Workspace({
  currentRoomName, currentRoomDisplayId, roomCreatedBy, remoteCursors, stickyNotes, chatHistory,
  reactions, unreadCount, myPos, activeTool, brushColor, brushWidth, paletteOpen, chatOpen, chatInput,
  username, cursorColor, canvasRef,
  onLeaveRoom, onDeleteRoom, onSetActiveTool, onSetBrushColor, onSetBrushWidth, onTogglePalette, onClosePalette,
  onToggleChat, onSetChatInput, onSendChat, onSendReaction,
  onCanvasMouseDown, onCanvasMouseMove, onCanvasMouseUp,
  onClearCanvas, onBoardClick, onBoardDoubleClick, onNoteMouseDown,
  onNoteUpdate, onNoteDelete, onCopy
}) {
  return (
    <div className="workspace-container" onClick={onBoardClick} onDoubleClick={onBoardDoubleClick}>
      <div className="grid-background" />

      <TopNav
        roomName={currentRoomName}
        roomDisplayId={currentRoomDisplayId}
        username={username}
        roomCreatedBy={roomCreatedBy}
        cursorColor={cursorColor}
        remoteCursors={remoteCursors}
        chatOpen={chatOpen}
        unreadCount={unreadCount}
        onToggleChat={onToggleChat}
        onLeaveRoom={onLeaveRoom}
        onDeleteRoom={onDeleteRoom}
        onCopy={onCopy}
      />

      <canvas
        ref={canvasRef}
        className="canvas-element"
        style={{
          cursor: activeTool === 'draw' || activeTool === 'eraser'
            ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${brushWidth + 12}' height='${brushWidth + 12}'%3E%3Ccircle cx='${(brushWidth + 12) / 2}' cy='${(brushWidth + 12) / 2}' r='${brushWidth / 2 + 2}' fill='none' stroke='white' stroke-width='1.5' opacity='0.7'/%3E%3C/svg%3E") ${(brushWidth + 12) / 2} ${(brushWidth + 12) / 2}, crosshair`
            : 'crosshair'
        }}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      />

      {stickyNotes.map(note => (
        <StickyNote
          key={note.id}
          note={note}
          onNoteMouseDown={onNoteMouseDown}
          onNoteUpdate={onNoteUpdate}
          onNoteDelete={onNoteDelete}
        />
      ))}

      <FloatingToolbar
        activeTool={activeTool}
        brushColor={brushColor}
        brushWidth={brushWidth}
        paletteOpen={paletteOpen}
        onSetTool={onSetActiveTool}
        onSetBrushColor={onSetBrushColor}
        onSetBrushWidth={onSetBrushWidth}
        onTogglePalette={onTogglePalette}
        onClosePalette={onClosePalette}
        onClearCanvas={onClearCanvas}
      />

      <ChatDrawer
        open={chatOpen}
        remoteCursors={remoteCursors}
        username={username}
        chatHistory={chatHistory}
        chatInput={chatInput}
        onChatInput={onSetChatInput}
        onSendChat={onSendChat}
        onClose={() => onToggleChat(null, false)}
      />

      <ReactionsPanel onSendReaction={onSendReaction} />

      <CursorTrail color={cursorColor} />

      <div style={{
        position: 'fixed', left: myPos.x, top: myPos.y, pointerEvents: 'none',
        transform: 'translate(-2px, -2px)', zIndex: 100
      }}>
        <svg width="22" height="22" viewBox="0 0 20 20">
          <path d="M0 0 L0 14 L4 10 L8 18 L10 17 L6 9 L11 9 Z" fill={cursorColor} stroke="#000" strokeWidth="1.5" />
        </svg>
      </div>

      <RemoteCursorOverlay remoteCursors={remoteCursors} />

      {reactions.map(r => (
        <div key={r.id} style={{
          position: 'fixed', left: r.x, top: r.y, fontSize: '36px', pointerEvents: 'none',
          animation: 'floatUp 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
          zIndex: 200, transform: 'translate(-50%, -50%)'
        }}>
          {r.emoji}
        </div>
      ))}
    </div>
  );
}
