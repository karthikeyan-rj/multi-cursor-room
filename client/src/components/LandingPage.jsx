import { Link } from 'react-router-dom';
import Starfield from './Starfield';

export default function LandingPage() {
  const features = [
    { title: 'Create Private Rooms', desc: 'Secure, protected spaces with unique, shareable 8-digit room IDs and passwords.' },
    { title: 'Live Cursors', desc: 'See every collaborator\'s cursor moving on the whiteboard in real time.' },
    { title: 'Shared Whiteboard', desc: 'Sketch ideas, draw shapes, and write text collaboratively on an infinite canvas.' },
    { title: 'Sticky Notes', desc: 'Add, color, move, and edit persistent sticky notes to organize thoughts.' },
    { title: 'Real-time Chat', desc: 'Discuss in real time with message alignment, thread replies, and emojis.' },
    { title: 'File Sharing', desc: 'Directly upload images or files to Cloudinary and share them instantly in room chat.' },
    { title: 'Room Collaboration', desc: 'Easily join, leave, or manage rooms with distinct owner permissions.' }
  ];

  return (
    <>
      <div className="lobby-container" style={{ paddingBottom: '60px' }}>
        <div className="lobby-hero" style={{ marginBottom: '32px' }}>
          <svg width="48" height="48" viewBox="0 0 40 40" fill="none" style={{ marginBottom: '24px', filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.35))' }}>
            <rect x="2" y="2" width="36" height="36" rx="10" stroke="url(#ag)" strokeWidth="2.5" fill="rgba(59,130,246,0.06)" />
            <path d="M14 20c0-4.4 2.7-8 6-8s6 3.6 6 8-2.7 8-6 8-6-3.6-6-8z" stroke="url(#ag)" strokeWidth="1.5" fill="none" />
            <path d="M10 28c1.5-3.5 4.5-5.5 8-5.5s6.5 2 8 5.5" stroke="url(#ag)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <circle cx="20" cy="18" r="3" fill="url(#ag)" />
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="40" y2="40">
                <stop stopColor="#3b82f6" /><stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <h1 className="lobby-title">Multiplayer Cursor Room</h1>
          <p className="lobby-subtitle" style={{ maxWidth: '600px', margin: '0 auto' }}>
            A powerful real-time collaborative workspace where your team can design, draw, chat, and capture thoughts instantly.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '48px', zIndex: 10 }}>
          <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: '600', display: 'inline-flex', alignItems: 'center' }}>
            Log In
          </Link>
          <Link to="/register" className="btn-primary" style={{ textDecoration: 'none', padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#fff' }}>
            Get Started &rarr;
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', width: '100%', maxWidth: '1000px', zIndex: 5, boxSizing: 'border-box' }}>
          {features.map((feature, i) => (
            <div key={i} className="panel-card glass card-glow" style={{ padding: '24px', textAlign: 'left', '--user-color': '#00F2FE', '--shine-delay': `${-0.4 * i}s` }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--accent)' }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
      <Starfield />
    </>
  );
}
