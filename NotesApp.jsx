import { useState, useRef, useEffect } from "react";

// ---------------------------------------------------------------------------
// Notes App
// - useState manages the notes array + UI state (input text, editing id)
// - useRef focuses the input field on mount and after adding/editing a note
// - Persistence: see the STORAGE_KEY block below. Claude.ai's live preview
//   sandbox blocks localStorage, so this file falls back to in-memory state
//   there. Drop this into your own project (Vite/CRA/Next) and it will use
//   real localStorage automatically — no changes needed.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "notes-app-data";

function loadNotes() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    // localStorage unavailable (e.g. sandboxed preview) — fall back gracefully
    return null;
  }
}

function saveNotes(notes) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (err) {
    // silently ignore in environments without storage access
  }
}

const SEED_NOTES = [
  { id: 1, text: "Pin your most important note to the top of your mind." },
  { id: 2, text: "Click the pencil to edit, the pin to delete." },
];

export default function NotesApp() {
  const [notes, setNotes] = useState(() => loadNotes() || SEED_NOTES);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");

  const inputRef = useRef(null);
  const editRef = useRef(null);

  // Focus the add-note input on first load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Persist to localStorage whenever notes change (no-ops safely if unsupported)
  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  // Focus the edit textarea whenever a note enters edit mode
  useEffect(() => {
    if (editingId !== null) {
      editRef.current?.focus();
      editRef.current?.select();
    }
  }, [editingId]);

  function addNote() {
    const text = draft.trim();
    if (!text) return;
    const newNote = { id: Date.now(), text };
    setNotes((prev) => [newNote, ...prev]);
    setDraft("");
    inputRef.current?.focus();
  }

  function handleAddKeyDown(e) {
    if (e.key === "Enter") addNote();
  }

  function startEdit(note) {
    setEditingId(note.id);
    setEditDraft(note.text);
  }

  function saveEdit(id) {
    const text = editDraft.trim();
    if (!text) {
      deleteNote(id);
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
    setEditingId(null);
    setEditDraft("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  function handleEditKeyDown(e, id) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit(id);
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  }

  function deleteNote(id) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (editingId === id) cancelEdit();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(circle, #E4DAC4 1px, transparent 1px) 0 0/16px 16px, #DCCFB0",
        padding: "48px 24px",
        boxSizing: "border-box",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <header style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: "'Space Mono', 'Courier New', monospace",
              fontSize: 30,
              fontWeight: 700,
              color: "#2E2A24",
              margin: "0 0 6px",
              letterSpacing: "-0.5px",
            }}
          >
            notes<span style={{ color: "#B9472A" }}>.</span>
          </h1>
          <p
            style={{
              fontFamily: "'Space Mono', 'Courier New', monospace",
              fontSize: 13,
              color: "#8A8172",
              margin: 0,
            }}
          >
            {notes.length} pinned to the board
          </p>
        </header>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 36,
            background: "#FBF8F0",
            border: "1px solid #E0D6C0",
            borderRadius: 10,
            padding: 8,
            boxShadow: "0 1px 2px rgba(46,42,36,0.06)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder="Write a new note and press Enter..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 15,
              color: "#2E2A24",
              padding: "10px 12px",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={addNote}
            disabled={!draft.trim()}
            style={{
              border: "none",
              borderRadius: 7,
              padding: "0 20px",
              background: draft.trim() ? "#B9472A" : "#E0D6C0",
              color: draft.trim() ? "#FBF8F0" : "#A79A7E",
              fontWeight: 600,
              fontSize: 14,
              cursor: draft.trim() ? "pointer" : "default",
              transition: "background 0.15s ease",
              fontFamily: "inherit",
            }}
          >
            + Pin note
          </button>
        </div>

        {notes.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "64px 20px",
              color: "#8A8172",
              fontFamily: "'Space Mono', 'Courier New', monospace",
              fontSize: 14,
            }}
          >
            The board is empty. Add your first note above.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 20,
            }}
          >
            {notes.map((note, i) => {
              const rotation = i % 3 === 0 ? -1.5 : i % 3 === 1 ? 1.5 : -0.5;
              const isEditing = editingId === note.id;
              return (
                <div
                  key={note.id}
                  style={{
                    position: "relative",
                    background: "#FDF9EC",
                    border: "1px solid #E6DCC2",
                    borderRadius: 3,
                    padding: "22px 16px 16px",
                    minHeight: 130,
                    boxShadow: "0 3px 6px rgba(46,42,36,0.12)",
                    transform: `rotate(${rotation}deg)`,
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "rotate(0deg) scale(1.02)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 14px rgba(46,42,36,0.18)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = `rotate(${rotation}deg)`;
                    e.currentTarget.style.boxShadow =
                      "0 3px 6px rgba(46,42,36,0.12)";
                  }}
                >
                  {/* pin */}
                  <div
                    style={{
                      position: "absolute",
                      top: -7,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#B9472A",
                      boxShadow: "0 2px 3px rgba(0,0,0,0.25)",
                      border: "2px solid #FDF9EC",
                    }}
                  />

                  {isEditing ? (
                    <textarea
                      ref={editRef}
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, note.id)}
                      onBlur={() => saveEdit(note.id)}
                      rows={4}
                      style={{
                        flex: 1,
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        resize: "none",
                        fontSize: 14.5,
                        lineHeight: 1.5,
                        color: "#2E2A24",
                        fontFamily: "inherit",
                      }}
                    />
                  ) : (
                    <p
                      style={{
                        flex: 1,
                        margin: "0 0 12px",
                        fontSize: 14.5,
                        lineHeight: 1.5,
                        color: "#2E2A24",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {note.text}
                    </p>
                  )}

                  {!isEditing && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 6,
                        marginTop: "auto",
                      }}
                    >
                      <button
                        onClick={() => startEdit(note)}
                        aria-label="Edit note"
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 13,
                          color: "#8A8172",
                          padding: "4px 8px",
                          borderRadius: 5,
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#EFE6D0")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        aria-label="Delete note"
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 13,
                          color: "#A3453A",
                          padding: "4px 8px",
                          borderRadius: 5,
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#F7E3DF")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
