// ============================================================
// FILE: frontend/src/App.js
// SAVE LOCATION: FUTURE_FS_02/frontend/src/App.js
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import "./styles.css";

const API_BASE = "http://localhost:5000/api";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["New", "Contacted", "Converted"];
const SOURCE_OPTIONS = ["Website", "Referral", "Social Media", "Email", "Cold Call", "Event", "Other"];

const EMPTY_LEAD = {
  name: "",
  email: "",
  phone: "",
  source: "Website",
  status: "New",
  notes: "",
  followUpDate: "",
};

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────
const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem("crm_token");
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const validate = (form) => {
  const errors = {};
  if (!form.name.trim() || form.name.trim().length < 2) errors.name = "Name must be at least 2 characters";
  if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Valid email is required";
  if (!form.phone.trim() || form.phone.trim().length < 7) errors.phone = "Valid phone number is required";
  if (!form.source) errors.source = "Source is required";
  if (!form.status) errors.status = "Status is required";
  return errors;
};

// ─────────────────────────────────────────────────────────────
// TOAST COMPONENT
// ─────────────────────────────────────────────────────────────
const ToastContainer = ({ toasts }) => (
  <div className="toast-container">
    {toasts.map((t) => (
      <div key={t.id} className={`toast ${t.type}`}>
        <span className="toast-icon">{t.type === "success" ? "✓" : "✕"}</span>
        <span>{t.message}</span>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cls = { New: "status-new", Contacted: "status-contacted", Converted: "status-converted" };
  return <span className={`status-badge ${cls[status] || ""}`}>{status}</span>;
};

// ─────────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────────
const LoginPage = ({ onLogin }) => {
  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: "" }));
    setServerError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.username.trim()) newErrors.username = "Username is required";
    if (!form.password.trim()) newErrors.password = "Password is required";
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("crm_token", data.token);
      localStorage.setItem("crm_user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🎯</div>
          <span className="login-logo-text">LeadFlow CRM</span>
        </div>
        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Sign in to your CRM dashboard</p>
        <div className="login-demo-badge">
          <span>🔑</span> Demo: admin / admin123
        </div>

        {serverError && (
          <div className="alert alert-error">
            <span>⚠</span> {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className={`form-input ${errors.username ? "error" : ""}`}
              type="text"
              name="username"
              placeholder="Enter your username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
            />
            {errors.username && <p className="form-error-msg">{errors.username}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className={`form-input ${errors.password ? "error" : ""}`}
              type="password"
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
            {errors.password && <p className="form-error-msg">{errors.password}</p>}
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? (
              <>
                <span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Signing in...
              </>
            ) : (
              "Sign In →"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// LEAD FORM MODAL
// ─────────────────────────────────────────────────────────────
const LeadFormModal = ({ lead, onClose, onSave }) => {
  const [form, setForm] = useState(
    lead
      ? { ...lead, followUpDate: lead.followUpDate ? lead.followUpDate.substring(0, 10) : "" }
      : { ...EMPTY_LEAD }
  );
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: "" }));
    setServerError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      if (lead) {
        await api(`/leads/${lead._id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await api("/leads", { method: "POST", body: JSON.stringify(form) });
      }
      onSave(lead ? "updated" : "created");
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{lead ? "✏️ Edit Lead" : "➕ Add New Lead"}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {serverError && (
            <div className="alert alert-error" style={{ marginBottom: 18 }}>
              <span>⚠</span> {serverError}
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate id="lead-form">
            <div className="form-grid">
              {/* Name */}
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className={`form-input ${errors.name ? "error" : ""}`} name="name" placeholder="John Doe" value={form.name} onChange={handleChange} />
                {errors.name && <p className="form-error-msg">{errors.name}</p>}
              </div>
              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className={`form-input ${errors.email ? "error" : ""}`} name="email" type="email" placeholder="john@example.com" value={form.email} onChange={handleChange} />
                {errors.email && <p className="form-error-msg">{errors.email}</p>}
              </div>
              {/* Phone */}
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input className={`form-input ${errors.phone ? "error" : ""}`} name="phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} />
                {errors.phone && <p className="form-error-msg">{errors.phone}</p>}
              </div>
              {/* Source */}
              <div className="form-group">
                <label className="form-label">Lead Source *</label>
                <select className={`form-select ${errors.source ? "error" : ""}`} name="source" value={form.source} onChange={handleChange}>
                  {SOURCE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
                {errors.source && <p className="form-error-msg">{errors.source}</p>}
              </div>
              {/* Status */}
              <div className="form-group">
                <label className="form-label">Status *</label>
                <select className={`form-select ${errors.status ? "error" : ""}`} name="status" value={form.status} onChange={handleChange}>
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
                {errors.status && <p className="form-error-msg">{errors.status}</p>}
              </div>
              {/* Follow Up Date */}
              <div className="form-group">
                <label className="form-label">Follow-up Date</label>
                <input className="form-input" type="date" name="followUpDate" value={form.followUpDate} onChange={handleChange} />
              </div>
              {/* Notes */}
              <div className="form-group span-2">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" name="notes" placeholder="Add any notes about this lead..." value={form.notes} onChange={handleChange} rows={3} maxLength={1000} />
              </div>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="lead-form" type="submit" disabled={loading}>
            {loading ? "Saving..." : lead ? "Update Lead" : "Add Lead"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VIEW LEAD MODAL
// ─────────────────────────────────────────────────────────────
const ViewLeadModal = ({ lead, onClose, onEdit }) => (
  <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal">
      <div className="modal-header">
        <h2 className="modal-title">👤 Lead Details</h2>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        <div className="lead-detail-grid">
          <div className="lead-detail-item">
            <span className="lead-detail-label">Name</span>
            <span className="lead-detail-value">{lead.name}</span>
          </div>
          <div className="lead-detail-item">
            <span className="lead-detail-label">Status</span>
            <span className="lead-detail-value"><StatusBadge status={lead.status} /></span>
          </div>
          <div className="lead-detail-item">
            <span className="lead-detail-label">Email</span>
            <span className="lead-detail-value">{lead.email}</span>
          </div>
          <div className="lead-detail-item">
            <span className="lead-detail-label">Phone</span>
            <span className="lead-detail-value">{lead.phone}</span>
          </div>
          <div className="lead-detail-item">
            <span className="lead-detail-label">Source</span>
            <span className="lead-detail-value">{lead.source}</span>
          </div>
          <div className="lead-detail-item">
            <span className="lead-detail-label">Follow-up Date</span>
            <span className="lead-detail-value">{formatDate(lead.followUpDate)}</span>
          </div>
          <div className="lead-detail-item">
            <span className="lead-detail-label">Created</span>
            <span className="lead-detail-value">{formatDate(lead.createdAt)}</span>
          </div>
          <div className="lead-detail-item">
            <span className="lead-detail-label">Last Updated</span>
            <span className="lead-detail-value">{formatDate(lead.updatedAt)}</span>
          </div>
          <div className="lead-detail-item lead-detail-full">
            <span className="lead-detail-label">Notes</span>
            <div className="lead-notes-box">{lead.notes || "No notes added."}</div>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={() => { onClose(); onEdit(lead); }}>Edit Lead</button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// CONFIRM DELETE MODAL
// ─────────────────────────────────────────────────────────────
const ConfirmModal = ({ lead, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal confirm-modal">
        <div className="modal-body">
          <div className="confirm-icon">🗑️</div>
          <h2 className="modal-title-center">Delete Lead</h2>
          <p className="confirm-desc" style={{ marginTop: 8 }}>
            Are you sure you want to delete <strong>{lead.name}</strong>? This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer" style={{ justifyContent: "center" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleConfirm} disabled={loading}>
            {loading ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD (MAIN)
// ─────────────────────────────────────────────────────────────
const Dashboard = ({ user, onLogout, addToast }) => {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, converted: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [activeView, setActiveView] = useState("leads");

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [viewLead, setViewLead] = useState(null);
  const [deleteLead, setDeleteLead] = useState(null);

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const searchTimer = useRef(null);

  const fetchLeads = useCallback(async (q = search, s = filterStatus) => {
    try {
      const params = new URLSearchParams();
      if (q) params.append("search", q);
      if (s) params.append("status", s);
      const data = await api(`/leads?${params.toString()}`);
      setLeads(data.data);
    } catch (err) {
      addToast("Failed to load leads: " + err.message, "error");
    }
  }, [search, filterStatus, addToast]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api("/leads/stats");
      setStats(data.data);
    } catch {}
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchLeads(), fetchStats()]);
    setLoading(false);
  }, [fetchLeads, fetchStats]);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchLeads(search, filterStatus), 350);
    return () => clearTimeout(searchTimer.current);
  }, [search, filterStatus]);

  const handleSaved = async (action) => {
    setShowForm(false);
    setEditLead(null);
    addToast(`Lead ${action} successfully! 🎉`, "success");
    await loadAll();
  };

  const handleDelete = async () => {
    try {
      await api(`/leads/${deleteLead._id}`, { method: "DELETE" });
      setDeleteLead(null);
      addToast("Lead deleted successfully.", "success");
      await loadAll();
    } catch (err) {
      addToast("Failed to delete: " + err.message, "error");
    }
  };

  const STAT_CARDS = [
    { key: "total", label: "Total Leads", icon: "📊", iconClass: "blue", value: stats.total },
    { key: "new", label: "New Leads", icon: "🆕", iconClass: "purple", value: stats.new },
    { key: "contacted", label: "Contacted", icon: "📞", iconClass: "yellow", value: stats.contacted },
    { key: "converted", label: "Converted", icon: "✅", iconClass: "green", value: stats.converted },
  ];

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Hamburger */}
      <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">🎯</div>
          <span className="sidebar-logo-text">LeadFlow</span>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Menu</span>
          <div
            className={`nav-item ${activeView === "leads" ? "active" : ""}`}
            onClick={() => { setActiveView("leads"); setSidebarOpen(false); }}
          >
            <span className="nav-item-icon">👥</span> All Leads
          </div>
          <div
            className={`nav-item ${filterStatus === "New" ? "active" : ""}`}
            onClick={() => { setFilterStatus("New"); setActiveView("leads"); setSidebarOpen(false); }}
          >
            <span className="nav-item-icon">🆕</span> New Leads
          </div>
          <div
            className={`nav-item ${filterStatus === "Contacted" ? "active" : ""}`}
            onClick={() => { setFilterStatus("Contacted"); setActiveView("leads"); setSidebarOpen(false); }}
          >
            <span className="nav-item-icon">📞</span> Contacted
          </div>
          <div
            className={`nav-item ${filterStatus === "Converted" ? "active" : ""}`}
            onClick={() => { setFilterStatus("Converted"); setActiveView("leads"); setSidebarOpen(false); }}
          >
            <span className="nav-item-icon">✅</span> Converted
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user.username[0].toUpperCase()}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-username">{user.username}</div>
              <div className="sidebar-role">Administrator</div>
            </div>
            <button className="btn-logout" onClick={onLogout} title="Logout">↩</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div>
            <div className="topbar-title">Client Leads</div>
            <div className="topbar-subtitle">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
          <div className="topbar-actions">
            <button
              className="btn btn-primary"
              onClick={() => { setEditLead(null); setShowForm(true); }}
            >
              + Add Lead
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="page-content">
          {/* Stats */}
          <div className="stats-grid">
            {STAT_CARDS.map((c) => (
              <div className="stat-card" key={c.key}>
                <div className={`stat-icon ${c.iconClass}`}>{c.icon}</div>
                <div className="stat-info">
                  <div className="stat-value">{loading ? "—" : c.value}</div>
                  <div className="stat-label">{c.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Leads Table */}
          <div className="leads-section">
            <div className="leads-toolbar">
              <div className="search-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  className="search-input"
                  placeholder="Search by name, email, phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
              {(search || filterStatus) && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setSearch(""); setFilterStatus(""); }}
                >
                  Clear
                </button>
              )}
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner" style={{ margin: "0 auto" }} />
                <p style={{ marginTop: 16, color: "var(--text-muted)", fontSize: 14 }}>Loading leads…</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">{search || filterStatus ? "🔎" : "📋"}</div>
                <div className="empty-title">{search || filterStatus ? "No leads found" : "No leads yet"}</div>
                <div className="empty-desc">
                  {search || filterStatus
                    ? "Try adjusting your search or filter."
                    : "Click \"Add Lead\" to add your first lead."}
                </div>
              </div>
            ) : (
              <>
                <div className="table-wrapper">
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Source</th>
                        <th>Status</th>
                        <th>Follow-up</th>
                        <th>Added</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead, idx) => (
                        <tr key={lead._id}>
                          <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{idx + 1}</td>
                          <td>
                            <div className="lead-name">{lead.name}</div>
                            <div className="lead-email">{lead.email}</div>
                          </td>
                          <td><span className="lead-phone">{lead.phone}</span></td>
                          <td><span className="source-chip">{lead.source}</span></td>
                          <td><StatusBadge status={lead.status} /></td>
                          <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>{formatDate(lead.followUpDate)}</td>
                          <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>{formatDate(lead.createdAt)}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="action-btn"
                                title="View"
                                onClick={() => setViewLead(lead)}
                              >👁</button>
                              <button
                                className="action-btn edit"
                                title="Edit"
                                onClick={() => { setEditLead(lead); setShowForm(true); }}
                              >✏️</button>
                              <button
                                className="action-btn delete"
                                title="Delete"
                                onClick={() => setDeleteLead(lead)}
                              >🗑</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer">
                  <span>Showing {leads.length} lead{leads.length !== 1 ? "s" : ""}</span>
                  {filterStatus && <span>Filtered by: <strong>{filterStatus}</strong></span>}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {showForm && (
        <LeadFormModal
          lead={editLead}
          onClose={() => { setShowForm(false); setEditLead(null); }}
          onSave={handleSaved}
        />
      )}
      {viewLead && (
        <ViewLeadModal
          lead={viewLead}
          onClose={() => setViewLead(null)}
          onEdit={(l) => { setEditLead(l); setShowForm(true); }}
        />
      )}
      {deleteLead && (
        <ConfirmModal
          lead={deleteLead}
          onClose={() => setDeleteLead(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Check persisted session
  useEffect(() => {
    const saved = localStorage.getItem("crm_user");
    const token = localStorage.getItem("crm_token");
    if (saved && token) {
      try { setUser(JSON.parse(saved)); } catch {}
    }
    setAppLoading(false);
  }, []);

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const handleLogin = (u) => setUser(u);

  const handleLogout = () => {
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_user");
    setUser(null);
    addToast("Logged out successfully.", "success");
  };

  if (appLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Starting LeadFlow CRM…</p>
      </div>
    );
  }

  return (
    <>
      {user ? (
        <div className="app-layout">
          <Dashboard user={user} onLogout={handleLogout} addToast={addToast} />
        </div>
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
      <ToastContainer toasts={toasts} />
    </>
  );
}