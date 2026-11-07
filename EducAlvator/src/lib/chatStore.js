import { create } from "zustand";
import { persist } from "zustand/middleware";

// Per-user Study Buddy chat sessions (history), persisted to localStorage so the
// sidebar can list past chats and the student can reopen and continue any of them.

export const GREETING = {
  from: "bot",
  text: "Hi, I'm your EducAlvator study buddy. What shall we explore today?",
};

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// A readable title from the first thing the student typed.
function titleFrom(messages) {
  const firstUser = messages.find((m) => m.from === "me" && m.text?.trim());
  const t = (firstUser?.text || "").trim();
  if (!t) return "New chat";
  return t.length > 34 ? t.slice(0, 34) + "…" : t;
}

// Strip anything that can't be persisted (e.g. File objects) — keep text + file
// labels only, which is all we need to re-render and resume a conversation.
function sanitize(messages) {
  return (messages || []).map((m) => ({
    from: m.from,
    text: m.text || "",
    files: (m.files || []).map((f) => ({ name: f.name, kind: f.kind })),
  }));
}

const freshSession = () => ({ id: newId(), title: "New chat", messages: [GREETING], updatedAt: Date.now() });

export const useChat = create(
  persist(
    (set, get) => ({
      byUser: {}, // { [uid]: { sessions: Session[], activeId } }

      // Make sure a user has at least one session and a valid active one.
      ensure(uid) {
        if (!uid) return;
        const b = get().byUser[uid];
        if (b && b.activeId && b.sessions.some((s) => s.id === b.activeId)) return;
        const s = freshSession();
        set((st) => ({ byUser: { ...st.byUser, [uid]: { sessions: [s], activeId: s.id } } }));
      },

      // Replace the active session's messages (sanitized), refreshing its title.
      setMessages(uid, messages) {
        set((st) => {
          const b = st.byUser[uid] || { sessions: [freshSession()], activeId: null };
          const activeId = b.activeId || b.sessions[0]?.id;
          const clean = sanitize(messages);
          const sessions = b.sessions.map((s) =>
            s.id === activeId
              ? { ...s, messages: clean, updatedAt: Date.now(), title: s.title === "New chat" ? titleFrom(clean) : s.title }
              : s
          );
          return { byUser: { ...st.byUser, [uid]: { sessions, activeId } } };
        });
      },

      // Start a brand-new chat and make it active.
      newChat(uid) {
        const s = freshSession();
        set((st) => {
          const b = st.byUser[uid] || { sessions: [], activeId: null };
          return { byUser: { ...st.byUser, [uid]: { sessions: [s, ...b.sessions], activeId: s.id } } };
        });
        return s.id;
      },

      // Rename a chat (user-set titles are kept; auto-titling won't overwrite).
      renameSession(uid, id, title) {
        const t = String(title || "").trim();
        if (!t) return;
        set((st) => {
          const b = st.byUser[uid];
          if (!b) return {};
          const sessions = b.sessions.map((s) => (s.id === id ? { ...s, title: t.slice(0, 60) } : s));
          return { byUser: { ...st.byUser, [uid]: { ...b, sessions } } };
        });
      },

      // Reopen a past chat.
      openSession(uid, id) {
        set((st) => {
          const b = st.byUser[uid];
          if (!b) return {};
          return { byUser: { ...st.byUser, [uid]: { ...b, activeId: id } } };
        });
      },

      // Delete a chat; if it was active, fall back to the newest remaining one.
      deleteSession(uid, id) {
        set((st) => {
          const b = st.byUser[uid];
          if (!b) return {};
          const sessions = b.sessions.filter((s) => s.id !== id);
          if (!sessions.length) sessions.push(freshSession());
          const activeId = b.activeId === id ? sessions[0].id : b.activeId;
          return { byUser: { ...st.byUser, [uid]: { sessions, activeId } } };
        });
      },
    }),
    { name: "educalvator.chat.v1" }
  )
);
