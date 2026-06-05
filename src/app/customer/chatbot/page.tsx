'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback, memo } from 'react';
import SharedNavRail from '../components/NavRail';
import MobileTabBar from '../components/MobileTabBar';

interface Message { role: 'user' | 'assistant'; content: string; }

/* ── Icons (defined outside – never remount) ── */
const Ico = ({ size = 20, sw = 1.8, children, style }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    {children}
  </svg>
);
const IconAI = (p: any) => <Ico {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></Ico>;
const IconMic = ({ size = 18, style }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 19v3"/><path d="M9 22h6"/>
  </svg>
);
const IconStop = ({ size = 18 }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none"/>
  </svg>
);
const IconSend = ({ size = 18 }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
  </svg>
);

/* ── Static sub-components (defined outside page fn) ── */
const AIAvatar = memo(({ size = 32 }: { size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, #a0522d 0%, #5c2a0e 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(160,82,45,0.3)',
  }}>
    <IconAI size={size * 0.48} style={{ stroke: 'white' }}/>
  </div>
));
AIAvatar.displayName = 'AIAvatar';

const Typing = memo(() => (
  <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 20, padding: '0 2px' }}>
    {[0,1,2].map(i => (
      <span key={i} style={{
        width: 7, height: 7, borderRadius: '50%', background: 'var(--brand)',
        display: 'inline-block', animation: `kb 1.3s ease-in-out ${i*0.18}s infinite`,
      }}/>
    ))}
    <style>{`@keyframes kb{0%,60%,100%{transform:translateY(0);opacity:.3}30%{transform:translateY(-6px);opacity:1}}`}</style>
  </div>
));
Typing.displayName = 'Typing';

const ChatHeader = memo(() => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 20px',
    borderBottom: '1px solid var(--hair)',
    background: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(12px)',
    flexShrink: 0,
  }}>
    <AIAvatar size={42}/>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>Dr. Kaya AI</div>
      <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3dba73', display: 'inline-block', boxShadow: '0 0 0 2px rgba(61,186,115,0.2)' }}/>
        Online · Dermatology assistant
      </div>
    </div>
    <div style={{ fontSize: 11, color: 'var(--mute)', background: 'var(--paper-2)', padding: '4px 10px', borderRadius: 20, fontFamily: 'var(--mono)' }}>
      Priya · 8842-G
    </div>
  </div>
));
ChatHeader.displayName = 'ChatHeader';

const QUICK = [
  { q: 'Can I use Tretinoin and Azelaic Acid together?', icon: '💊' },
  { q: 'My skin is peeling after the chemical peel — normal?', icon: '🧴' },
  { q: 'How long before I see results from my regimen?', icon: '📅' },
  { q: 'What to avoid before my HydraFacial session?', icon: '✋' },
];

/* Props-based sub-components */
const MessageList = memo(({ messages, loading, bottomRef }: {
  messages: Message[]; loading: boolean; bottomRef: React.RefObject<HTMLDivElement>;
}) => (
  <div style={{
    overflowY: 'auto', overflowX: 'hidden',
    padding: '20px 16px 8px',
    display: 'flex', flexDirection: 'column', gap: 16,
    flex: 1,
    background: 'radial-gradient(ellipse at 60% 0%, rgba(160,82,45,0.04) 0%, transparent 60%), var(--paper-grad)',
  }}>
    {messages.map((msg, i) => (
      <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
        {msg.role === 'assistant' && <AIAvatar size={28}/>}
        <div style={{
          maxWidth: '72%',
          padding: '12px 16px',
          borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
          background: msg.role === 'user'
            ? 'linear-gradient(135deg, #a0522d 0%, #6b2d14 100%)'
            : 'white',
          color: msg.role === 'user' ? 'white' : 'var(--ink)',
          fontSize: 14, lineHeight: 1.65,
          boxShadow: msg.role === 'user' ? '0 2px 12px rgba(160,82,45,0.25)' : '0 1px 6px rgba(0,0,0,0.07)',
          whiteSpace: 'pre-wrap',
        }}>
          {msg.content}
        </div>
        {msg.role === 'user' && (
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'radial-gradient(circle at 35% 30%, #e6c9a8, #6b4628)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: 'white', fontFamily: 'var(--mono)',
          }}>PR</div>
        )}
      </div>
    ))}
    {loading && (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <AIAvatar size={28}/>
        <div style={{ padding: '12px 16px', borderRadius: '4px 18px 18px 18px', background: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
          <Typing/>
        </div>
      </div>
    )}
    <div ref={bottomRef}/>
  </div>
));
MessageList.displayName = 'MessageList';

const QuickPills = memo(({ onSend }: { onSend: (q: string) => void }) => (
  <div style={{ padding: '0 16px 10px', background: 'var(--paper-grad)', flexShrink: 0 }}>
    <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Quick questions</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {QUICK.map(({ q, icon }, i) => (
        <button key={i} onClick={() => onSend(q)} style={{
          display: 'flex', alignItems: 'flex-start', gap: 7, textAlign: 'left',
          padding: '10px 12px', background: 'white',
          border: '1px solid var(--hair)', borderRadius: 12, cursor: 'pointer',
          color: 'var(--ink)', fontSize: 12, fontWeight: 500, lineHeight: 1.4,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--hair)'; }}
        >
          <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>{q}
        </button>
      ))}
    </div>
  </div>
));
QuickPills.displayName = 'QuickPills';

const InputBar = memo(({ input, loading, isListening, voiceOk, focused,
  onInput, onKeyDown, onFocus, onBlur, onSend, onVoice, inputRef }: {
  input: string; loading: boolean; isListening: boolean; voiceOk: boolean; focused: boolean;
  onInput: (v: string) => void; onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void; onBlur: () => void;
  onSend: () => void; onVoice: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) => (
  <div style={{
    padding: '10px 16px 14px',
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(16px)',
    borderTop: '1px solid var(--hair)',
    flexShrink: 0,
  }}>
    {isListening && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 8, fontSize: 12, color: '#e53935', fontWeight: 600 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e53935', display: 'inline-block', animation: 'kp 1s ease infinite' }}/>
        Listening… speak now
        <style>{`@keyframes kp{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.4}}`}</style>
      </div>
    )}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--paper)',
      border: `2px solid ${isListening ? '#e53935' : focused ? 'var(--brand)' : 'var(--hair)'}`,
      borderRadius: 28, padding: '7px 7px 7px 18px',
      boxShadow: focused ? '0 0 0 3px rgba(160,82,45,0.08)' : '0 2px 12px rgba(0,0,0,0.06)',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => onInput(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={isListening ? 'Listening…' : 'Ask Dr. Kaya AI anything…'}
        disabled={loading}
        style={{
          flex: 1, border: 'none', background: 'transparent', outline: 'none',
          fontSize: 15, color: 'var(--ink)', minWidth: 0,
        }}
      />
      {voiceOk && (
        <button onClick={onVoice} style={{
          width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isListening ? 'linear-gradient(135deg,#e53935,#b71c1c)' : 'var(--paper-2)',
          color: isListening ? 'white' : 'var(--mute)',
          boxShadow: isListening ? '0 0 0 4px rgba(229,57,53,0.15)' : 'none',
          transition: 'all 0.2s',
        }}>
          {isListening ? <IconStop size={17}/> : <IconMic size={17}/>}
        </button>
      )}
      <button onClick={onSend} disabled={!input.trim() || loading} style={{
        width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0,
        cursor: input.trim() && !loading ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: input.trim() && !loading ? 'linear-gradient(135deg,#a0522d,#6b2d14)' : 'var(--hair-2)',
        color: input.trim() && !loading ? 'white' : 'var(--mute-2)',
        boxShadow: input.trim() && !loading ? '0 3px 12px rgba(160,82,45,0.4)' : 'none',
        transform: input.trim() && !loading ? 'scale(1)' : 'scale(0.88)',
        transition: 'all 0.2s',
      }}>
        <IconSend size={16}/>
      </button>
    </div>
  </div>
));
InputBar.displayName = 'InputBar';

/* ── Page ── */
export default function ChatbotPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: "Hi Priya! I'm Dr. Kaya AI. I know your current protocol well — you're at 94% compliance, which is excellent. What's on your mind today?",
  }]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [isListening, setListening] = useState(false);
  const [voiceOk, setVoiceOk]       = useState(false);
  const [focused, setFocused]       = useState(false);
  const recRef    = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const inputRef  = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;

  useEffect(() => {
    if (!localStorage.getItem('user')) router.push('/customer/login');
    setVoiceOk(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
  }, [router]);

  // Only scroll when a new message is added (length changes), not on every re-render
  const msgCount = messages.length;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgCount, loading]);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/customer/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages.slice(1) }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Something went wrong.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  const toggleVoice = useCallback(() => {
    if (isListening) { recRef.current?.stop(); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'en-IN'; r.interimResults = false; r.maxAlternatives = 1;
    r.onstart  = () => setListening(true);
    r.onend    = () => setListening(false);
    r.onerror  = () => setListening(false);
    r.onresult = (e: any) => { setInput(e.results[0][0].transcript); inputRef.current?.focus(); };
    recRef.current = r; r.start();
  }, [isListening]);

  const inputProps = {
    input, loading, isListening, voiceOk, focused,
    onInput: setInput, onKeyDown: handleKeyDown,
    onFocus: () => setFocused(true), onBlur: () => setFocused(false),
    onSend: () => send(), onVoice: toggleVoice, inputRef,
  };

  const showQuick = messages.length <= 1;

  /* ── Desktop ── */
  const Desktop = (
    <div className="frame" style={{ display: 'flex' }}>
      <SharedNavRail active="chatbot"/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <ChatHeader/>
        <MessageList messages={messages} loading={loading} bottomRef={bottomRef}/>
        {showQuick && <QuickPills onSend={send}/>}
        <InputBar {...inputProps}/>
      </div>
    </div>
  );

  /* ── Mobile ── */
  const Mobile = (
    <div className="frame">
      {/* status bar */}
      <div className="statusbar">
        <span>9:41</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[0,1,2].map(i => <span key={i} style={{ width:4,height:4,background:'currentColor',borderRadius:'50%',display:'inline-block'}}/>)}
          <svg width="16" height="11" viewBox="0 0 16 11" fill="none"><rect x=".5" y=".5" width="13" height="10" rx="2" stroke="currentColor"/><rect x="2" y="2" width="9" height="7" fill="currentColor"/><rect x="14" y="3.5" width="1.5" height="4" rx=".5" fill="currentColor"/></svg>
        </span>
      </div>

      {/* scrollable content — padded at bottom so it clears the input bar + tabbar */}
      <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 160 }}>
        <ChatHeader/>

        {/* messages */}
        <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
              {msg.role === 'assistant' && <AIAvatar size={28}/>}
              <div style={{
                maxWidth: '78%', padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                background: msg.role === 'user' ? 'linear-gradient(135deg,#a0522d,#6b2d14)' : 'white',
                color: msg.role === 'user' ? 'white' : 'var(--ink)',
                fontSize: 14, lineHeight: 1.65,
                boxShadow: msg.role === 'user' ? '0 2px 12px rgba(160,82,45,0.25)' : '0 1px 6px rgba(0,0,0,0.07)',
                whiteSpace: 'pre-wrap',
              }}>{msg.content}</div>
              {msg.role === 'user' && (
                <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
                  background:'radial-gradient(circle at 35% 30%,#e6c9a8,#6b4628)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:10, fontWeight:700, color:'white', fontFamily:'var(--mono)',
                }}>PR</div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
              <AIAvatar size={28}/>
              <div style={{ padding:'12px 16px', borderRadius:'4px 18px 18px 18px', background:'white', boxShadow:'0 1px 6px rgba(0,0,0,0.07)' }}>
                <Typing/>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* quick questions — centred */}
        {showQuick && (
          <div style={{ padding: '32px 16px 12px' }}>
            <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
              Quick questions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {QUICK.map(({ q, icon }, i) => (
                <button key={i} onClick={() => send(q)} style={{
                  display:'flex', alignItems:'flex-start', gap:7, textAlign:'left',
                  padding:'10px 12px', background:'white',
                  border:'1px solid var(--hair)', borderRadius:12, cursor:'pointer',
                  color:'var(--ink)', fontSize:12, fontWeight:500, lineHeight:1.4,
                  boxShadow:'0 1px 4px rgba(0,0,0,0.05)',
                }}>
                  <span style={{ fontSize:15, flexShrink:0 }}>{icon}</span>{q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* input bar — absolutely positioned above the tabbar */}
      <div style={{
        position: 'absolute',
        bottom: 88, /* 12px tabbar-margin + 64px tabbar-height + 12px gap */
        left: 12, right: 12,
        background: 'white',
        borderRadius: 20,
        boxShadow: '0 -2px 24px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)',
        padding: '10px 10px 10px 18px',
        display: 'flex', alignItems: 'center', gap: 8,
        border: `2px solid ${isListening ? '#e53935' : focused ? '#a0522d' : '#e8e0d8'}`,
        transition: 'border-color 0.2s',
        zIndex: 10,
      }}>
        {isListening && (
          <div style={{ position:'absolute', top:-28, left:0, right:0, textAlign:'center', fontSize:11, color:'#e53935', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <span style={{ width:7,height:7,borderRadius:'50%',background:'#e53935',display:'inline-block',animation:'kp 1s ease infinite' }}/>
            Listening…
            <style>{`@keyframes kp{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.4}}`}</style>
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ask Dr. Kaya AI anything…"
          disabled={loading}
          style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:15, color:'#1a1a1a', minWidth:0 }}
        />
        {voiceOk && (
          <button onClick={toggleVoice} style={{
            width:40, height:40, borderRadius:'50%', border:'none', cursor:'pointer', flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            background: isListening ? 'linear-gradient(135deg,#e53935,#b71c1c)' : '#f0ece8',
            color: isListening ? 'white' : '#888',
            transition:'all 0.2s',
          }}>
            {isListening ? <IconStop size={17}/> : <IconMic size={17}/>}
          </button>
        )}
        <button onClick={() => send()} disabled={!input.trim() || loading} style={{
          width:40, height:40, borderRadius:'50%', border:'none', flexShrink:0,
          cursor: input.trim() && !loading ? 'pointer' : 'default',
          display:'flex', alignItems:'center', justifyContent:'center',
          background: input.trim() && !loading ? 'linear-gradient(135deg,#a0522d,#6b2d14)' : '#e8e4e0',
          color: input.trim() && !loading ? 'white' : '#bbb',
          boxShadow: input.trim() && !loading ? '0 3px 12px rgba(160,82,45,0.4)' : 'none',
          transition:'all 0.2s',
        }}>
          <IconSend size={16}/>
        </button>
      </div>

      {/* tab bar */}
      <MobileTabBar active="ai"/>
    </div>
  );

  return (
    <>
      <div className="desktop-only">{Desktop}</div>
      <div className="mobile-only">{Mobile}</div>
    </>
  );
}
