"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { loadSettings, saveSettings, MODEL_OPTIONS, type Settings } from "@/lib/settings";

const ACCENT = "#1a73e8";
const SIDEBAR_W = 230;
const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

const callAI = async (endpoint: string, payload: any, settings: Settings) => {
  const res = await fetch(`/api/ai/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload, provider: settings.aiProvider, model: settings.model, tone: settings.tone,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `API error ${res.status}`);
  }
  return res.json();
};

const S: any = {
  input: {
    width: "100%", padding: "11px 14px", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: 14, outline: "none",
    fontFamily: "'DM Sans', sans-serif", background: "#fff",
    color: "#1e293b", boxSizing: "border-box",
  },
  label: {
    display: "block", fontSize: 11, fontWeight: 700, color: "#64748b",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em",
  },
  btn: (bg: string, color: string, disabled: boolean) => ({
    padding: "10px 18px", borderRadius: 8, background: disabled ? "#e2e8f0" : bg,
    color: disabled ? "#94a3b8" : color, border: "none",
    cursor: disabled ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif", display: "flex",
    alignItems: "center", gap: 6, whiteSpace: "nowrap", transition: "opacity 0.15s",
  }),
};

const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const Toast = ({ msg, type }: { msg: string; type: string }) => (
  <div style={{
    marginTop: 14, padding: "12px 16px", borderRadius: 8, fontSize: 14,
    whiteSpace: "pre-wrap", lineHeight: 1.6,
    background: type === "error" ? "#fef2f2" : type === "success" ? "#f0fdf4" : "#f8fafc",
    border: `1px solid ${type === "error" ? "#fecaca" : type === "success" ? "#bbf7d0" : "#e2e8f0"}`,
    color: type === "error" ? "#dc2626" : type === "success" ? "#15803d" : "#1e293b",
  }}>{msg}</div>
);

// Reusable AI edit box — used in both Draft and Send views
const RefineWithAI = ({ subject, body, setSubject, setBody, settings, isMobile, onToast }: any) => {
  const [instruction, setInstruction] = useState("");
  const [refining, setRefining] = useState(false);
  const [previous, setPrevious] = useState<{ subject: string; body: string } | null>(null);

  const refine = async () => {
    if (!instruction.trim() || !body.trim()) return;
    setRefining(true);
    // Save current state for undo
    setPrevious({ subject, body });
    try {
      const data = await callAI("edit", { subject, body, instruction }, settings);
      setSubject(data.subject || subject);
      setBody(data.body || body);
      setInstruction("");
      onToast?.({ msg: "✓ Draft refined — Undo to revert", type: "success" });
    } catch (e: any) {
      onToast?.({ msg: `Error: ${e.message}`, type: "error" });
      setPrevious(null); // No undo state if edit failed
    }
    setRefining(false);
  };

  const undo = () => {
    if (!previous) return;
    setSubject(previous.subject);
    setBody(previous.body);
    setPrevious(null);
    onToast?.({ msg: "✓ Reverted to previous version", type: "info" });
  };

  if (!body.trim()) return null; // Don't show until there's a draft to edit

  return (
    <div style={{
      background: "#fef9c3", borderRadius: 10, padding: 14, marginTop: 16,
      border: "1px solid #fde047",
    }}>
      <label style={S.label}>🪄 Refine with AI</label>
      <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
        <input value={instruction} onChange={e => setInstruction(e.target.value)}
          onKeyDown={e => e.key === "Enter" && refine()}
          placeholder="e.g. shorter, more formal, less apologetic"
          style={{ ...S.input, flex: 1, background: "#fff" }} />
        <button onClick={refine} disabled={refining || !instruction.trim()}
          style={{ ...S.btn(ACCENT, "#fff", refining || !instruction.trim()), justifyContent: "center" }}>
          {refining ? <Spinner /> : "Refine"}
        </button>
        {previous && (
          <button onClick={undo}
            style={{ ...S.btn("#f1f5f9", "#475569", false), justifyContent: "center" }}>
            ↶ Undo
          </button>
        )}
      </div>
    </div>
  );
};

const NAV = [
  { key: "draft", label: "Draft", fullLabel: "Draft Email", icon: "✏️" },
  { key: "inbox", label: "Inbox", fullLabel: "Read Inbox", icon: "📬" },
  { key: "send", label: "Send", fullLabel: "Send Email", icon: "📤" },
  { key: "calendar", label: "Tasks", fullLabel: "Add Task", icon: "📅" },
  { key: "settings", label: "Settings", fullLabel: "Settings", icon: "⚙️" },
];

const Sidebar = ({ active, setActive, email }: any) => (
  <aside style={{
    width: SIDEBAR_W, minHeight: "100vh", background: "#0f172a",
    display: "flex", flexDirection: "column", borderRight: "1px solid #1e293b", flexShrink: 0,
  }}>
    <div style={{ padding: "26px 22px 18px", borderBottom: "1px solid #1e293b" }}>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "#f8fafc" }}>MailDesk</div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 6, fontFamily: "monospace", letterSpacing: "0.06em" }}>
        AI POWERED
      </div>
    </div>
    <nav style={{ padding: "14px 10px", flex: 1 }}>
      {NAV.map(item => (
        <button key={item.key} onClick={() => setActive(item.key)} style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "10px 12px", borderRadius: 8, marginBottom: 2,
          background: active === item.key ? "#1e293b" : "transparent",
          color: active === item.key ? "#f1f5f9" : "#64748b",
          border: "none", cursor: "pointer", fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: active === item.key ? 600 : 400,
          borderLeft: active === item.key ? `3px solid ${ACCENT}` : "3px solid transparent",
          textAlign: "left",
        }}>
          <span>{item.icon}</span>{item.fullLabel}
        </button>
      ))}
    </nav>
    <div style={{ padding: "14px 22px", borderTop: "1px solid #1e293b" }}>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, wordBreak: "break-all" }}>{email}</div>
    </div>
  </aside>
);

const BottomNav = ({ active, setActive }: any) => (
  <nav style={{
    position: "fixed", bottom: 0, left: 0, right: 0,
    background: "#0f172a", borderTop: "1px solid #1e293b",
    display: "flex", justifyContent: "space-around", zIndex: 50,
    paddingBottom: "env(safe-area-inset-bottom)",
  }}>
    {NAV.map(item => (
      <button key={item.key} onClick={() => setActive(item.key)} style={{
        flex: 1, padding: "10px 4px", background: "transparent", border: "none",
        cursor: "pointer", display: "flex", flexDirection: "column",
        alignItems: "center", gap: 2,
        color: active === item.key ? "#f1f5f9" : "#64748b",
        fontFamily: "'DM Sans', sans-serif",
        borderTop: active === item.key ? `2px solid ${ACCENT}` : "2px solid transparent",
        marginTop: -1,
      }}>
        <span style={{ fontSize: 22 }}>{item.icon}</span>
        <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
      </button>
    ))}
  </nav>
);

const Page = ({ title, sub, children, isMobile }: any) => (
  <div style={{
    flex: 1, padding: isMobile ? "20px 16px 80px" : "36px 40px",
    fontFamily: "'DM Sans', sans-serif", maxWidth: 680,
  }}>
    <h1 style={{ fontSize: isMobile ? 22 : 26, fontFamily: "'DM Serif Display', serif", color: "#0f172a", margin: "0 0 4px" }}>{title}</h1>
    <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px" }}>{sub}</p>
    {children}
  </div>
);

const DraftView = ({ settings, isMobile }: { settings: Settings; isMobile: boolean }) => {
  const [prompt, setPrompt] = useState("");
  const [to, setTo] = useState(""), [subject, setSubject] = useState(""), [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<any>(null);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setToast(null);
    try {
      const data = await callAI("draft", { prompt, signature: settings.signature }, settings);
      setSubject(data.subject || ""); setBody(data.body || "");
      setToast({ msg: "✓ Draft generated.", type: "success" });
    } catch (e: any) { setToast({ msg: `Error: ${e.message}`, type: "error" }); }
    setLoading(false);
  };

  return (
    <Page title="Draft Email" sub="AI writes your email — you review and send" isMobile={isMobile}>
      <div style={{ background: "#eff6ff", borderRadius: 10, padding: 14, marginBottom: 20, border: "1px solid #bfdbfe" }}>
        <label style={S.label}>✨ Describe your email</label>
        <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
          <input value={prompt} onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === "Enter" && generate()}
            placeholder="e.g. Follow up with Sarah"
            style={{ ...S.input, flex: 1, background: "#fff" }} />
          <button onClick={generate} disabled={loading || !prompt.trim()}
            style={{ ...S.btn(ACCENT, "#fff", loading || !prompt.trim()), justifyContent: "center" }}>
            {loading ? <Spinner /> : "Generate"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><label style={S.label}>To</label>
          <input value={to} onChange={e => setTo(e.target.value)} placeholder="recipient@email.com" style={S.input} /></div>
        <div><label style={S.label}>Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line" style={S.input} /></div>
        <div><label style={S.label}>Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={9}
            placeholder="Your email body will appear here…"
            style={{ ...S.input, resize: "vertical", lineHeight: 1.65 }} /></div>
      </div>

      <RefineWithAI subject={subject} body={body} setSubject={setSubject} setBody={setBody}
        settings={settings} isMobile={isMobile} onToast={setToast} />

      <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end", flexDirection: isMobile ? "column" : "row" }}>
        <button onClick={() => navigator.clipboard.writeText(`To: ${to}\nSubject: ${subject}\n\n${body}`)}
          disabled={!body} style={{ ...S.btn("#f1f5f9", "#475569", !body), justifyContent: "center" }}>📋 Copy</button>
        <button onClick={() => window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)}
          disabled={!to || !subject || !body}
          style={{ ...S.btn("#0f172a", "#f8fafc", !to || !subject || !body), justifyContent: "center" }}>
          📨 Open in Mail App
        </button>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </Page>
  );
};

const InboxView = ({ settings, isMobile }: { settings: Settings; isMobile: boolean }) => {
  const [emails, setEmails] = useState<any[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});

  const loadInbox = async () => {
    setLoading(true); setToast(null);
    try {
      const res = await fetch(`/api/gmail/inbox?count=${settings.inboxCount}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load inbox");
      setEmails(data.emails || []); setLoaded(true);
    } catch (e: any) { setToast({ msg: `Error: ${e.message}`, type: "error" }); }
    setLoading(false);
  };

  const summarizeAll = async () => {
    if (emails.length === 0) return;
    setSummarizing(true); setSummary(""); setToast(null);
    try {
      const emailText = emails.map(e => `From: ${e.from}\nSubject: ${e.subject}\n${e.snippet}\n`).join("\n---\n");
      const data = await callAI("summarize", { emails: emailText }, settings);
      setSummary(data.summary || "");
    } catch (e: any) { setToast({ msg: `Error: ${e.message}`, type: "error" }); }
    setSummarizing(false);
  };

  const toggleExpand = async (id: string) => {
    const isOpen = expanded[id];
    setExpanded(prev => ({ ...prev, [id]: !isOpen }));
    if (!isOpen && !summaries[id]) {
      setLoadingIds(prev => ({ ...prev, [id]: true }));
      try {
        const res = await fetch("/api/gmail/summarize-one", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: id, provider: settings.aiProvider, model: settings.model }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to summarize");
        setSummaries(prev => ({ ...prev, [id]: data.summary }));
      } catch (e: any) {
        setSummaries(prev => ({ ...prev, [id]: `Error: ${e.message}` }));
      }
      setLoadingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <Page title="Read Inbox" sub={`Your latest ${settings.inboxCount} emails`} isMobile={isMobile}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexDirection: isMobile ? "column" : "row" }}>
        <button onClick={loadInbox} disabled={loading}
          style={{ ...S.btn(ACCENT, "#fff", loading), justifyContent: "center" }}>
          {loading ? <><Spinner /> Loading…</> : (loaded ? "🔄 Refresh" : "📥 Load Inbox")}
        </button>
        {emails.length > 0 && (
          <button onClick={summarizeAll} disabled={summarizing}
            style={{ ...S.btn("#0f172a", "#f8fafc", summarizing), justifyContent: "center" }}>
            {summarizing ? <><Spinner /> Summarizing…</> : "✦ Summarize all"}
          </button>
        )}
      </div>

      {summary && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 18, marginBottom: 20, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7, color: "#1e293b" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Summary</div>
          {summary}
        </div>
      )}

      {emails.length === 0 && loaded && !loading && (
        <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No emails found.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {emails.map(e => {
          const isOpen = expanded[e.id];
          const isLoading = loadingIds[e.id];
          const itemSummary = summaries[e.id];
          return (
            <div key={e.id} style={{
              borderRadius: 10, border: "1px solid #e2e8f0",
              background: e.unread ? "#f0f9ff" : "#fff", overflow: "hidden",
            }}>
              <button onClick={() => toggleExpand(e.id)} style={{
                display: "flex", width: "100%", padding: "14px 16px",
                background: "transparent", border: "none", cursor: "pointer",
                textAlign: "left", fontFamily: "inherit", alignItems: "flex-start", gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
                    <div style={{ fontWeight: e.unread ? 700 : 600, fontSize: 14, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.from}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", flexShrink: 0, whiteSpace: "nowrap" }}>
                      {new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: "#1e293b", marginBottom: 4, fontWeight: e.unread ? 600 : 400 }}>{e.subject}</div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{e.snippet}</div>
                </div>
                <div style={{ fontSize: 14, color: "#94a3b8", paddingTop: 2, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</div>
              </button>
              {isOpen && (
                <div style={{ padding: "0 16px 16px 16px", borderTop: "1px solid #e2e8f0", background: "#fafbfc" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginTop: 14, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>✨ AI Summary</div>
                  {isLoading ? (
                    <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                      <Spinner /> Reading the full email…
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{itemSummary || "—"}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </Page>
  );
};

const SendView = ({ settings, isMobile }: { settings: Settings; isMobile: boolean }) => {
  const [prompt, setPrompt] = useState("");
  const [to, setTo] = useState(""), [subject, setSubject] = useState(""), [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false), [sending, setSending] = useState(false);
  const [toast, setToast] = useState<any>(null);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true); setToast(null);
    try {
      const data = await callAI("draft", { prompt, signature: settings.signature }, settings);
      setSubject(data.subject || ""); setBody(data.body || "");
      setToast({ msg: "✓ Draft ready.", type: "success" });
    } catch (e: any) { setToast({ msg: `Error: ${e.message}`, type: "error" }); }
    setGenerating(false);
  };

  const send = async () => {
    if (!to || !subject || !body) return;
    let finalBody = body;
    if (settings.signature && !body.includes(settings.signature)) {
      finalBody = body.trimEnd() + "\n\n" + settings.signature;
    }
    if (!confirm(`Send this email to ${to}?`)) return;
    setSending(true); setToast(null);
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body: finalBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setToast({ msg: `✓ Email sent to ${to}`, type: "success" });
      setTo(""); setSubject(""); setBody(""); setPrompt("");
    } catch (e: any) { setToast({ msg: `Error: ${e.message}`, type: "error" }); }
    setSending(false);
  };

  return (
    <Page title="Send Email" sub="Send directly from Gmail" isMobile={isMobile}>
      <div style={{ background: "#eff6ff", borderRadius: 10, padding: 14, marginBottom: 20, border: "1px solid #bfdbfe" }}>
        <label style={S.label}>✨ Describe an email</label>
        <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
          <input value={prompt} onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === "Enter" && generate()}
            placeholder="e.g. Thank Sarah for the meeting"
            style={{ ...S.input, flex: 1, background: "#fff" }} />
          <button onClick={generate} disabled={generating || !prompt.trim()}
            style={{ ...S.btn(ACCENT, "#fff", generating || !prompt.trim()), justifyContent: "center" }}>
            {generating ? <Spinner /> : "Generate"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><label style={S.label}>To</label>
          <input value={to} onChange={e => setTo(e.target.value)} placeholder="recipient@email.com" style={S.input} /></div>
        <div><label style={S.label}>Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line" style={S.input} /></div>
        <div><label style={S.label}>Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={10}
            placeholder="Write or paste your email here…"
            style={{ ...S.input, resize: "vertical", lineHeight: 1.65 }} /></div>
        {settings.signature && (
          <div style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>
            ℹ️ Your signature will be appended automatically when sending.
          </div>
        )}
      </div>

      <RefineWithAI subject={subject} body={body} setSubject={setSubject} setBody={setBody}
        settings={settings} isMobile={isMobile} onToast={setToast} />

      <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
        <button onClick={send} disabled={sending || !to || !subject || !body}
          style={{ ...S.btn("#15803d", "#fff", sending || !to || !subject || !body), justifyContent: "center", width: isMobile ? "100%" : "auto" }}>
          {sending ? <><Spinner /> Sending…</> : "📨 Send Email"}
        </button>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </Page>
  );
};

const EventModal = ({ event, onClose, onSave, onDelete }: any) => {
  const eStart = new Date(event.start);
  const eEnd = new Date(event.end);
  const [title, setTitle] = useState(event.summary || "");
  const [date, setDate] = useState(eStart.toISOString().split("T")[0]);
  const [time, setTime] = useState(eStart.toTimeString().slice(0, 5));
  const [duration, setDuration] = useState(Math.round((eEnd.getTime() - eStart.getTime()) / 60000));
  const [notes, setNotes] = useState(event.description || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const startDate = new Date(`${date}T${time}`);
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    await onSave({
      id: event.id, title, start: startDate.toISOString(),
      end: endDate.toISOString(), notes,
    });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${event.summary}"? This cannot be undone.`)) return;
    setDeleting(true);
    await onDelete(event.id);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 14, padding: 24, width: "100%",
        maxWidth: 440, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#0f172a" }}>Edit Event</div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", cursor: "pointer", fontSize: 22, color: "#64748b",
          }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={S.label}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} style={S.input} /></div>
          <div><label style={S.label}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={S.input} /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><label style={S.label}>Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={S.input} /></div>
            <div style={{ width: 110 }}><label style={S.label}>Duration</label>
              <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 60)}
                min={15} max={480} step={15} style={S.input} /></div>
          </div>
          <div><label style={S.label}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Optional…" style={{ ...S.input, resize: "vertical" }} /></div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "space-between", flexWrap: "wrap" }}>
          <button onClick={handleDelete} disabled={deleting || saving}
            style={S.btn("#dc2626", "#fff", deleting || saving)}>
            {deleting ? <><Spinner /> Deleting…</> : "🗑 Delete"}
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} disabled={saving || deleting}
              style={S.btn("#f1f5f9", "#475569", saving || deleting)}>Cancel</button>
            <button onClick={handleSave} disabled={saving || deleting || !title.trim()}
              style={S.btn(ACCENT, "#fff", saving || deleting || !title.trim())}>
              {saving ? <><Spinner /> Saving…</> : "💾 Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CalendarView = ({ settings, isMobile }: { settings: Settings; isMobile: boolean }) => {
  const [naturalInput, setNaturalInput] = useState("");
  const [title, setTitle] = useState(""), [date, setDate] = useState("");
  const [time, setTime] = useState(""), [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState("");
  const [parsing, setParsing] = useState(false), [suggesting, setSuggesting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayOffset, setDayOffset] = useState(0);
  const [toast, setToast] = useState<any>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const sunday = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay() + weekOffset * 7);
    return d;
  })();
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday); d.setDate(sunday.getDate() + i); return d;
  });

  const mobileDay = (() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dayOffset);
    return d;
  })();

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset, dayOffset, isMobile]);

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const timeMin = isMobile ? mobileDay.toISOString() : sunday.toISOString();
      const timeMaxDate = isMobile
        ? new Date(mobileDay.getTime() + 24 * 60 * 60 * 1000)
        : saturday;
      const res = await fetch(
        `/api/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMaxDate.toISOString())}`
      );
      const data = await res.json();
      if (res.ok) setEvents(data.events || []);
    } catch {}
    setLoadingEvents(false);
  };

  const parseNatural = async () => {
    if (!naturalInput.trim()) return;
    setParsing(true); setToast(null);
    try {
      const res = await fetch("/api/ai/parse-event", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: naturalInput, provider: settings.aiProvider, model: settings.model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      setTitle(data.title || ""); setDate(data.date || "");
      setTime(data.time || ""); setDuration(data.durationMinutes || 60);
      setNotes(data.notes || "");
      setToast({ msg: "✓ Parsed — review before saving.", type: "success" });
    } catch (e: any) { setToast({ msg: `Error: ${e.message}`, type: "error" }); }
    setParsing(false);
  };

  const suggestTime = async () => {
    if (!title.trim()) { setToast({ msg: "Enter a title first.", type: "info" }); return; }
    setSuggesting(true); setToast(null);
    try {
      const res = await fetch("/api/ai/suggest-time", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, provider: settings.aiProvider, model: settings.model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Suggest failed");
      setDate(data.date || ""); setTime(data.time || ""); setDuration(data.durationMinutes || 60);
      setToast({ msg: `✓ ${data.reasoning || "Time suggested"}`, type: "info" });
    } catch (e: any) { setToast({ msg: `Error: ${e.message}`, type: "error" }); }
    setSuggesting(false);
  };

  const createEvent = async () => {
    if (!title.trim()) return;
    setCreating(true); setToast(null);
    try {
      let startISO, endISO;
      if (date && time) {
        const sd = new Date(`${date}T${time}`);
        startISO = sd.toISOString();
        endISO = new Date(sd.getTime() + duration * 60 * 1000).toISOString();
      } else if (date) {
        const sd = new Date(`${date}T09:00`);
        startISO = sd.toISOString();
        endISO = new Date(sd.getTime() + duration * 60 * 1000).toISOString();
      } else {
        setToast({ msg: "Please pick a date.", type: "error" }); setCreating(false); return;
      }
      const res = await fetch("/api/calendar/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, start: startISO, end: endISO, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setToast({ msg: `✓ "${title}" added`, type: "success" });
      setNaturalInput(""); setTitle(""); setDate(""); setTime("");
      setDuration(60); setNotes("");
      loadEvents();
    } catch (e: any) { setToast({ msg: `Error: ${e.message}`, type: "error" }); }
    setCreating(false);
  };

  const handleEventSave = async (data: any) => {
    try {
      const res = await fetch("/api/calendar/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Update failed");
      setToast({ msg: "✓ Event updated", type: "success" });
      setEditingEvent(null);
      loadEvents();
    } catch (e: any) { setToast({ msg: `Error: ${e.message}`, type: "error" }); }
  };

  const handleEventDelete = async (id: string) => {
    try {
      const res = await fetch("/api/calendar/delete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Delete failed");
      setToast({ msg: "✓ Event deleted", type: "success" });
      setEditingEvent(null);
      loadEvents();
    } catch (e: any) { setToast({ msg: `Error: ${e.message}`, type: "error" }); }
  };

  const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
  const HOUR_HEIGHT = 48;
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const eventsForDay = (day: Date) =>
    events.filter(e => {
      if (!e.start) return false;
      const ed = new Date(e.start); return sameDay(ed, day);
    });

  const eventBlock = (e: any) => {
    if (e.isAllDay) return null;
    const start = new Date(e.start), end = new Date(e.end);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = (startHour - HOURS[0]) * HOUR_HEIGHT;
    const height = Math.max(20, (endHour - startHour) * HOUR_HEIGHT);
    if (startHour > HOURS[HOURS.length - 1] + 1 || endHour < HOURS[0]) return null;
    return (
      <button key={e.id} onClick={() => setEditingEvent(e)} style={{
        position: "absolute", left: 2, right: 2, top, height,
        background: "#dbeafe", borderLeft: "3px solid #1a73e8",
        borderRadius: 4, padding: "3px 6px", overflow: "hidden",
        fontSize: 11, color: "#0f172a", lineHeight: 1.3,
        textAlign: "left", cursor: "pointer", fontFamily: "inherit",
      }} title={`${e.summary} — click to edit`}>
        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.summary}</div>
        <div style={{ fontSize: 10, color: "#475569" }}>{start.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</div>
      </button>
    );
  };

  const today = new Date();
  const monthLabel = (isMobile ? mobileDay : sunday).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  if (isMobile) {
    return (
      <div style={{ paddingBottom: 80 }}>
        <Page title="Add Task" sub="Tap events to edit" isMobile={true}>
          <div style={{ background: "#eff6ff", borderRadius: 10, padding: 14, marginBottom: 16, border: "1px solid #bfdbfe" }}>
            <label style={S.label}>✨ Quick add</label>
            <div style={{ display: "flex", gap: 6, flexDirection: "column" }}>
              <input value={naturalInput} onChange={e => setNaturalInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && parseNatural()}
                placeholder="e.g. Lunch with Sam Tue 1pm"
                style={{ ...S.input, background: "#fff" }} />
              <button onClick={parseNatural} disabled={parsing || !naturalInput.trim()}
                style={{ ...S.btn(ACCENT, "#fff", parsing || !naturalInput.trim()), justifyContent: "center" }}>
                {parsing ? <Spinner /> : "Parse with AI"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={S.label}>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Call with Sarah" style={S.input} /></div>
            <div><label style={S.label}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={S.input} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}><label style={S.label}>Time</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={S.input} /></div>
              <div style={{ width: 110 }}><label style={S.label}>Min</label>
                <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 60)}
                  min={15} max={480} step={15} style={S.input} /></div>
            </div>
            <div><label style={S.label}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Optional…" style={{ ...S.input, resize: "vertical" }} /></div>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={suggestTime} disabled={suggesting || !title.trim()}
                style={{ ...S.btn("#f1f5f9", "#475569", suggesting || !title.trim()), justifyContent: "center", flex: 1 }}>
                {suggesting ? <Spinner /> : "✨ Suggest"}
              </button>
              <button onClick={createEvent} disabled={creating || !title.trim()}
                style={{ ...S.btn(ACCENT, "#fff", creating || !title.trim()), justifyContent: "center", flex: 1 }}>
                {creating ? <Spinner /> : "📅 Add"}
              </button>
            </div>
            {toast && <Toast msg={toast.msg} type={toast.type} />}
          </div>

          <div style={{ marginTop: 28, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button onClick={() => setDayOffset(dayOffset - 1)} style={{
                background: "transparent", border: "none", fontSize: 20, color: "#64748b", cursor: "pointer", padding: 4,
              }}>‹</button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: sameDay(mobileDay, today) ? ACCENT : "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  {sameDay(mobileDay, today) ? "Today" : mobileDay.toLocaleDateString(undefined, { weekday: "long" })}
                </div>
                <div style={{ fontSize: 15, color: "#0f172a", fontWeight: 500 }}>
                  {mobileDay.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
                </div>
              </div>
              <button onClick={() => setDayOffset(dayOffset + 1)} style={{
                background: "transparent", border: "none", fontSize: 20, color: "#64748b", cursor: "pointer", padding: 4,
              }}>›</button>
            </div>
            <div style={{ position: "relative", maxHeight: 500, overflowY: "auto" }}>
              <div style={{ display: "flex" }}>
                <div style={{ width: 48, flexShrink: 0 }}>
                  {HOURS.map(h => (
                    <div key={h} style={{
                      height: HOUR_HEIGHT, fontSize: 10, color: "#94a3b8",
                      padding: "0 6px", textAlign: "right",
                      borderTop: h === HOURS[0] ? "none" : "1px solid #f1f5f9",
                      position: "relative", top: -6,
                    }}>{h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}</div>
                  ))}
                </div>
                <div style={{ flex: 1, borderLeft: "1px solid #e2e8f0", position: "relative" }}>
                  {HOURS.map(h => (
                    <div key={h} style={{
                      height: HOUR_HEIGHT,
                      borderTop: h === HOURS[0] ? "none" : "1px solid #f1f5f9",
                    }} />
                  ))}
                  {eventsForDay(mobileDay).map(eventBlock)}
                </div>
              </div>
            </div>
            {loadingEvents && <div style={{ padding: 8, textAlign: "center", fontSize: 11, color: "#94a3b8" }}>Loading…</div>}
            {dayOffset !== 0 && (
              <div style={{ padding: 8, textAlign: "center" }}>
                <button onClick={() => setDayOffset(0)} style={{
                  background: "transparent", border: "1px solid #e2e8f0", borderRadius: 6,
                  padding: "4px 12px", fontSize: 12, color: "#64748b", cursor: "pointer",
                }}>Jump to today</button>
              </div>
            )}
          </div>
        </Page>

        {editingEvent && (
          <EventModal event={editingEvent} onClose={() => setEditingEvent(null)}
            onSave={handleEventSave} onDelete={handleEventDelete} />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
      <div style={{ width: 380, padding: "32px 28px", overflowY: "auto", borderRight: "1px solid #e2e8f0", flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontFamily: "'DM Serif Display', serif", color: "#0f172a", margin: "0 0 4px" }}>Add Task</h1>
        <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 22px" }}>Click events to edit</p>

        <div style={{ background: "#eff6ff", borderRadius: 10, padding: 14, marginBottom: 20, border: "1px solid #bfdbfe" }}>
          <label style={S.label}>✨ Quick add</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={naturalInput} onChange={e => setNaturalInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && parseNatural()}
              placeholder="e.g. Lunch with Sam Tue 1pm"
              style={{ ...S.input, flex: 1, background: "#fff", fontSize: 13 }} />
            <button onClick={parseNatural} disabled={parsing || !naturalInput.trim()}
              style={{ ...S.btn(ACCENT, "#fff", parsing || !naturalInput.trim()), padding: "9px 12px" }}>
              {parsing ? <Spinner /> : "Parse"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div><label style={S.label}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Call with Sarah" style={S.input} /></div>
          <div><label style={S.label}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={S.input} /></div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}><label style={S.label}>Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={S.input} /></div>
            <div style={{ width: 100 }}><label style={S.label}>Duration</label>
              <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 60)}
                min={15} max={480} step={15} style={S.input} /></div>
          </div>
          <div><label style={S.label}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Optional…" style={{ ...S.input, resize: "vertical" }} /></div>

          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button onClick={suggestTime} disabled={suggesting || !title.trim()}
              style={{ ...S.btn("#f1f5f9", "#475569", suggesting || !title.trim()), padding: "8px 12px", fontSize: 13 }}>
              {suggesting ? <Spinner /> : "✨ Suggest"}
            </button>
            <button onClick={createEvent} disabled={creating || !title.trim()}
              style={{ ...S.btn(ACCENT, "#fff", creating || !title.trim()), padding: "8px 12px", fontSize: 13, flex: 1, justifyContent: "center" }}>
              {creating ? <><Spinner /> Adding…</> : "📅 Add to Calendar"}
            </button>
          </div>
          {toast && <Toast msg={toast.msg} type={toast.type} />}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <button onClick={() => setWeekOffset(0)} style={{
            padding: "6px 14px", borderRadius: 6, border: "1px solid #e2e8f0",
            background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
          }}>Today</button>
          <button onClick={() => setWeekOffset(weekOffset - 1)} style={{
            width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent",
            cursor: "pointer", fontSize: 18, color: "#64748b",
          }}>‹</button>
          <button onClick={() => setWeekOffset(weekOffset + 1)} style={{
            width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent",
            cursor: "pointer", fontSize: 18, color: "#64748b",
          }}>›</button>
          <div style={{ fontSize: 18, color: "#0f172a", fontWeight: 500 }}>{monthLabel}</div>
          {loadingEvents && <span style={{ fontSize: 12, color: "#94a3b8" }}>Loading…</span>}
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
          <div style={{ width: 56, flexShrink: 0 }}></div>
          {weekDays.map(d => {
            const isToday = sameDay(d, today);
            return (
              <div key={d.toISOString()} style={{
                flex: 1, padding: "8px 4px", textAlign: "center", borderLeft: "1px solid #e2e8f0",
              }}>
                <div style={{ fontSize: 11, color: isToday ? ACCENT : "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div style={{
                  fontSize: 22, color: isToday ? "#fff" : "#0f172a",
                  fontWeight: 400, marginTop: 4,
                  background: isToday ? ACCENT : "transparent",
                  width: 34, height: 34, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "4px auto 0",
                }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ display: "flex", position: "relative" }}>
            <div style={{ width: 56, flexShrink: 0 }}>
              {HOURS.map(h => (
                <div key={h} style={{
                  height: HOUR_HEIGHT, fontSize: 10, color: "#94a3b8",
                  padding: "0 6px", textAlign: "right",
                  borderTop: h === HOURS[0] ? "none" : "1px solid #f1f5f9",
                  position: "relative", top: -6,
                }}>
                  {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
                </div>
              ))}
            </div>
            {weekDays.map(d => (
              <div key={d.toISOString()} style={{
                flex: 1, borderLeft: "1px solid #e2e8f0", position: "relative",
              }}>
                {HOURS.map(h => (
                  <div key={h} style={{
                    height: HOUR_HEIGHT,
                    borderTop: h === HOURS[0] ? "none" : "1px solid #f1f5f9",
                  }} />
                ))}
                {eventsForDay(d).map(eventBlock)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {editingEvent && (
        <EventModal event={editingEvent} onClose={() => setEditingEvent(null)}
          onSave={handleEventSave} onDelete={handleEventDelete} />
      )}
    </div>
  );
};

const SettingsView = ({ settings, setSettings, isMobile }: { settings: Settings; setSettings: (s: Settings) => void; isMobile: boolean }) => {
  const [draft, setDraft] = useState<Settings>(settings);
  const [toast, setToast] = useState<any>(null);

  const save = () => {
    saveSettings(draft); setSettings(draft);
    setToast({ msg: "✓ Settings saved", type: "success" });
    setTimeout(() => setToast(null), 2000);
  };

  const providerOptions: { id: Settings["aiProvider"]; label: string; note: string }[] = [
    { id: "gemini", label: "Google Gemini", note: "Free tier available" },
    { id: "anthropic", label: "Anthropic Claude", note: "Paid (add ANTHROPIC_API_KEY)" },
    { id: "openai", label: "OpenAI GPT", note: "Paid (add OPENAI_API_KEY)" },
    { id: "groq", label: "Groq (Llama)", note: "Free (add GROQ_API_KEY)" },
  ];

  return (
    <Page title="Settings" sub="Configure your preferences" isMobile={isMobile}>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <section>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 14, color: "#0f172a" }}>🤖 AI Model</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label style={S.label}>Provider</label>
              <select value={draft.aiProvider}
                onChange={e => {
                  const newProvider = e.target.value as Settings["aiProvider"];
                  setDraft({ ...draft, aiProvider: newProvider, model: MODEL_OPTIONS[newProvider][0].id });
                }}
                style={S.input}>
                {providerOptions.map(p => (<option key={p.id} value={p.id}>{p.label} — {p.note}</option>))}
              </select>
            </div>
            <div><label style={S.label}>Model</label>
              <select value={draft.model} onChange={e => setDraft({ ...draft, model: e.target.value })} style={S.input}>
                {MODEL_OPTIONS[draft.aiProvider].map(m => (<option key={m.id} value={m.id}>{m.label}</option>))}
              </select>
            </div>
            {draft.aiProvider !== "gemini" && (
              <div style={{ fontSize: 12, color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
                ℹ️ This provider needs an API key. If you haven't added it yet, add the corresponding key to <code>.env.local</code> (and Vercel) and redeploy. If it's already added, you can ignore this.
              </div>
            )}
          </div>
        </section>

        <section>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 14, color: "#0f172a" }}>✍️ Drafting Style</div>
          <label style={S.label}>Default tone</label>
          <select value={draft.tone} onChange={e => setDraft({ ...draft, tone: e.target.value as any })} style={S.input}>
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="friendly">Friendly</option>
            <option value="direct">Direct & Concise</option>
          </select>
        </section>

        <section>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 14, color: "#0f172a" }}>📝 Signature</div>
          <label style={S.label}>Auto-appended to sent emails</label>
          <textarea value={draft.signature} onChange={e => setDraft({ ...draft, signature: e.target.value })}
            rows={4} placeholder={"e.g.\nBest,\nEmma Carter"}
            style={{ ...S.input, resize: "vertical", lineHeight: 1.6 }} />
        </section>

        <section>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 14, color: "#0f172a" }}>📬 Inbox</div>
          <label style={S.label}>Emails to load</label>
          <select value={draft.inboxCount} onChange={e => setDraft({ ...draft, inboxCount: parseInt(e.target.value) })} style={S.input}>
            <option value={10}>10 emails</option>
            <option value={20}>20 emails</option>
            <option value={30}>30 emails</option>
            <option value={50}>50 emails</option>
          </select>
        </section>

        <section style={{ borderTop: "1px solid #e2e8f0", paddingTop: 24 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 14, color: "#0f172a" }}>👤 Account</div>
          <button onClick={() => signOut({ callbackUrl: "/" })}
            style={{ ...S.btn("#dc2626", "#fff", false), justifyContent: "center", width: isMobile ? "100%" : "auto" }}>
            Sign out of MailDesk
          </button>
        </section>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={save} style={{ ...S.btn(ACCENT, "#fff", false), justifyContent: "center", width: isMobile ? "100%" : "auto" }}>💾 Save Settings</button>
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    </Page>
  );
};

export default function Home() {
  const { data: session, status } = useSession();
  const isMobile = useIsMobile();
  const [active, setActive] = useState("draft");
  const [settings, setSettings] = useState<Settings>({
    aiProvider: "gemini", model: "gemini-flash-latest",
    tone: "professional", signature: "", inboxCount: 20,
  });

  useEffect(() => { setSettings(loadSettings()); }, []);

  if (status === "loading") return <main style={{ padding: 40 }}>Loading...</main>;

  if (!session) {
    return (
      <main style={{ padding: 40, fontFamily: "system-ui" }}>
        <h1>MailDesk</h1>
        <p>Sign in to access your email and calendar.</p>
        <button onClick={() => signIn("google")} style={{
          padding: "12px 24px", fontSize: 16, background: "#1a73e8", color: "white",
          border: "none", borderRadius: 8, cursor: "pointer",
        }}>Sign in with Google</button>
      </main>
    );
  }

  const views: any = {
    draft: <DraftView settings={settings} isMobile={isMobile} />,
    inbox: <InboxView settings={settings} isMobile={isMobile} />,
    send: <SendView settings={settings} isMobile={isMobile} />,
    calendar: <CalendarView settings={settings} isMobile={isMobile} />,
    settings: <SettingsView settings={settings} setSettings={setSettings} isMobile={isMobile} />,
  };

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap'); * { box-sizing: border-box; } body { margin: 0; -webkit-font-smoothing: antialiased; } @keyframes spin { to { transform: rotate(360deg); } } input:focus, textarea:focus, select:focus { border-color: #1a73e8 !important; box-shadow: 0 0 0 3px rgba(26,115,232,0.12); } button:hover:not(:disabled) { opacity: 0.88; } select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3e%3cpath d='M6 9l6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; padding-right: 40px; } input, textarea, select { font-size: 16px !important; }`}</style>
      <div style={{ display: "flex", minHeight: "100vh", flexDirection: isMobile ? "column" : "row" }}>
        {!isMobile && <Sidebar active={active} setActive={setActive} email={session.user?.email} />}
        <main style={{ flex: 1, background: "#fff" }}>{views[active]}</main>
        {isMobile && <BottomNav active={active} setActive={setActive} />}
      </div>
    </>
  );
}
