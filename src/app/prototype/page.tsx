"use client";

import { useState } from "react";

// Design tokens inspired by briankemler.com
const gold = "#c4a055";
const goldHover = "#d4b065";
const darkBg = "#111111";
const cardBg = "#1a1a1a";
const cardBorder = "#2a2a2a";
const mutedText = "#999999";
const subtleText = "#bbbbbb";

type Step = "browse" | "request" | "requested" | "admin-pending" | "admin-approve" | "admin-approved" | "member-approved" | "admin-complete" | "done";

export default function PrototypePage() {
  const [step, setStep] = useState<Step>("browse");

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: darkBg,
        color: "#ffffff",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: `1px solid ${cardBorder}`,
          padding: "0 2rem",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#0a0a0a",
        }}
      >
        <span
          style={{
            fontWeight: 800,
            fontSize: "1.1rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          The Missing Chapter
        </span>
        <nav style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {["Catalog", "My Books", "Admin"].map((item, i) => (
            <span
              key={item}
              style={{
                fontSize: "0.875rem",
                color: i === 0 ? gold : subtleText,
                cursor: "pointer",
              }}
            >
              {item}
            </span>
          ))}
          <div style={{ position: "relative", cursor: "pointer" }}>
            <BellIcon />
            {(step === "admin-pending" || step === "admin-approve" || step === "member-approved") && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  backgroundColor: "#ef4444",
                  fontSize: "10px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                1
              </span>
            )}
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "#333",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            KB
          </div>
        </nav>
      </header>

      {/* Flow indicator */}
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "2rem 1.5rem 1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          {[
            { key: "browse", label: "1. Browse" },
            { key: "request", label: "2. Request" },
            { key: "admin-pending", label: "3. Admin Review" },
            { key: "admin-approved", label: "4. Pickup Scheduled" },
            { key: "done", label: "5. Complete" },
          ].map((s, i, arr) => {
            const stepOrder = ["browse", "request", "requested", "admin-pending", "admin-approve", "admin-approved", "member-approved", "admin-complete", "done"];
            const currentIdx = stepOrder.indexOf(step);
            const thisIdx = stepOrder.indexOf(s.key);
            const isActive = currentIdx >= thisIdx;
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: "9999px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    backgroundColor: isActive ? gold : "#222",
                    color: isActive ? "#111" : mutedText,
                    transition: "all 0.3s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.label}
                </div>
                {i < arr.length - 1 && (
                  <div
                    style={{
                      width: 24,
                      height: 2,
                      backgroundColor: isActive ? gold : "#333",
                      transition: "all 0.3s",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: "0.8rem", color: mutedText, marginBottom: "1.5rem" }}>
          {stepDescription(step)}
        </p>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 1.5rem 3rem" }}>
        {(step === "browse" || step === "request" || step === "requested") && (
          <MemberCheckoutView step={step} onNext={setStep} />
        )}
        {(step === "admin-pending" || step === "admin-approve") && (
          <AdminPendingView step={step} onNext={setStep} />
        )}
        {step === "admin-approved" && (
          <AdminApprovedView onNext={setStep} />
        )}
        {step === "member-approved" && (
          <MemberDashboardView onNext={setStep} />
        )}
        {step === "admin-complete" && (
          <AdminCompleteView onNext={setStep} />
        )}
        {step === "done" && <DoneView onReset={() => setStep("browse")} />}
      </div>
    </div>
  );
}

// ─── Step Views ──────────────────────────────────────────────────

function MemberCheckoutView({ step, onNext }: { step: Step; onNext: (s: Step) => void }) {
  return (
    <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
      {/* Book card */}
      <div
        style={{
          flex: "0 0 200px",
          height: 300,
          borderRadius: 12,
          background: "linear-gradient(135deg, #2d4a3e 0%, #1a3a2e 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${cardBorder}`,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <BookIcon />
          <p style={{ fontSize: "0.85rem", color: subtleText, marginTop: 8 }}>Book Cover</p>
        </div>
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 300 }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <StatusBadge status={step === "requested" ? "Pending Pickup" : "Available"} />
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.25rem" }}>
          The Design of Everyday Things
        </h1>
        <p style={{ color: subtleText, fontSize: "1rem", marginBottom: "1.5rem" }}>
          Norman, Don
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <InfoCell label="Genre" value="Non-Fiction" />
          <InfoCell label="Condition" value="Very Good" />
          <InfoCell label="Book ID" value="BID-0042" />
          <InfoCell label="Loan Period" value="21 days" />
        </div>

        {step === "browse" && (
          <>
            <div
              style={{
                backgroundColor: "rgba(196, 160, 85, 0.1)",
                border: `1px solid rgba(196, 160, 85, 0.25)`,
                borderRadius: 8,
                padding: "0.75rem 1rem",
                marginBottom: "1.5rem",
                fontSize: "0.85rem",
                color: gold,
              }}
            >
              An admin will review your request and schedule a pickup time. You&apos;ll be notified when it&apos;s approved.
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <GoldButton onClick={() => onNext("request")}>Request Checkout</GoldButton>
              <OutlineButton>Place 24-Hour Hold</OutlineButton>
            </div>
          </>
        )}

        {step === "request" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>
              <SpinnerIcon />
            </div>
            <p style={{ color: subtleText, marginTop: "1rem", fontSize: "0.9rem" }}>Submitting request...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            {/* Auto-advance after animation */}
            <AutoAdvance delay={1500} onAdvance={() => onNext("requested")} />
          </div>
        )}

        {step === "requested" && (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <CheckIcon />
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0.75rem 0 0.25rem" }}>
              Request Submitted!
            </h2>
            <p style={{ color: subtleText, fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              You&apos;ll be notified when your pickup is scheduled.
            </p>
            <GoldButton onClick={() => onNext("admin-pending")}>
              Continue as Admin &rarr;
            </GoldButton>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminPendingView({ step, onNext }: { step: Step; onNext: (s: Step) => void }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>Checkout Requests</h1>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, backgroundColor: gold, color: "#111", padding: "0.2rem 0.6rem", borderRadius: "9999px" }}>Admin View</span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: `1px solid ${cardBorder}` }}>
        <TabButton active>
          Pending <span style={{ backgroundColor: "#ef4444", color: "#fff", fontSize: "0.65rem", padding: "0.1rem 0.4rem", borderRadius: "9999px", marginLeft: 6, fontWeight: 700 }}>1</span>
        </TabButton>
        <TabButton>Approved</TabButton>
      </div>

      {/* Request row */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: "1rem" }}>The Design of Everyday Things</p>
            <p style={{ color: mutedText, fontSize: "0.8rem" }}>BID-0042</p>
          </div>
          <div>
            <p style={{ fontSize: "0.9rem" }}>Booker, Kara</p>
            <p style={{ color: mutedText, fontSize: "0.8rem" }}>MID-0002</p>
          </div>
          <div>
            <p style={{ fontSize: "0.85rem", color: mutedText }}>Requested</p>
            <p style={{ fontSize: "0.9rem" }}>01/03/2026</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {step === "admin-pending" && (
              <>
                <GoldButton size="sm" onClick={() => onNext("admin-approve")}>Approve</GoldButton>
                <DangerButton size="sm">Deny</DangerButton>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Approve dialog */}
      {step === "admin-approve" && (
        <ModalOverlay>
          <div
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: 16,
              padding: "2rem",
              maxWidth: 440,
              width: "100%",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>Schedule Pickup</h2>
            <p style={{ color: mutedText, fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              Approve &quot;The Design of Everyday Things&quot; for Booker, Kara
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <FormField label="Pickup Date" type="date" defaultValue="2026-03-04" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <FormField label="Window Start" type="time" defaultValue="10:00" />
                <FormField label="Window End" type="time" defaultValue="14:00" />
              </div>
              <FormField label="Notes (optional)" type="textarea" placeholder="e.g., The book will be on the front shelf..." />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
              <OutlineButton onClick={() => onNext("admin-pending")}>Cancel</OutlineButton>
              <GoldButton onClick={() => onNext("admin-approved")}>Approve &amp; Schedule</GoldButton>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

function AdminApprovedView({ onNext }: { onNext: (s: Step) => void }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>Checkout Requests</h1>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, backgroundColor: gold, color: "#111", padding: "0.2rem 0.6rem", borderRadius: "9999px" }}>Admin View</span>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: `1px solid ${cardBorder}` }}>
        <TabButton>Pending</TabButton>
        <TabButton active>
          Approved <span style={{ backgroundColor: "#333", color: "#ccc", fontSize: "0.65rem", padding: "0.1rem 0.4rem", borderRadius: "9999px", marginLeft: 6, fontWeight: 700 }}>1</span>
        </TabButton>
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: "1rem" }}>The Design of Everyday Things</p>
            <p style={{ color: mutedText, fontSize: "0.8rem" }}>BID-0042</p>
          </div>
          <div>
            <p style={{ fontSize: "0.9rem" }}>Booker, Kara</p>
            <p style={{ color: mutedText, fontSize: "0.8rem" }}>MID-0002</p>
          </div>
          <div>
            <p style={{ fontSize: "0.85rem", color: mutedText }}>Pickup</p>
            <p style={{ fontSize: "0.9rem" }}>04/03/2026</p>
            <p style={{ fontSize: "0.8rem", color: subtleText }}>10:00–14:00</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <OutlineButton onClick={() => onNext("member-approved")}>
              View as Member &rarr;
            </OutlineButton>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MemberDashboardView({ onNext }: { onNext: (s: Step) => void }) {
  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>Welcome, Kara!</h1>
        <p style={{ color: mutedText }}>Your book exchange dashboard</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        <MiniStat label="Credits" value="3" />
        <MiniStat label="Books Out" value="0" />
        <MiniStat label="Donations" value="2" />
      </div>

      <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>Pending Requests</h2>
      <Card>
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          <div
            style={{
              width: 56,
              height: 72,
              borderRadius: 6,
              backgroundColor: "#2d4a3e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BookIconSmall />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <div>
                <p style={{ fontWeight: 700 }}>The Design of Everyday Things</p>
                <p style={{ color: mutedText, fontSize: "0.8rem" }}>Requested: 01/03/2026</p>
              </div>
              <StatusBadge status="Approved" />
            </div>
            <div
              style={{
                backgroundColor: "rgba(34, 197, 94, 0.08)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
                borderRadius: 8,
                padding: "0.75rem 1rem",
                marginBottom: "0.75rem",
              }}
            >
              <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "#4ade80" }}>
                Pickup: 04/03/2026
              </p>
              <p style={{ fontSize: "0.8rem", color: "#86efac" }}>
                Window: 10:00–14:00
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <GoldButton size="sm" onClick={() => onNext("admin-complete")}>
                Continue as Admin &rarr;
              </GoldButton>
              <OutlineButton size="sm">Cancel Request</OutlineButton>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AdminCompleteView({ onNext }: { onNext: (s: Step) => void }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>Checkout Requests</h1>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, backgroundColor: gold, color: "#111", padding: "0.2rem 0.6rem", borderRadius: "9999px" }}>Admin View</span>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: `1px solid ${cardBorder}` }}>
        <TabButton>Pending</TabButton>
        <TabButton active>Approved</TabButton>
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: "1rem" }}>The Design of Everyday Things</p>
            <p style={{ color: mutedText, fontSize: "0.8rem" }}>BID-0042</p>
          </div>
          <div>
            <p style={{ fontSize: "0.9rem" }}>Booker, Kara</p>
            <p style={{ color: mutedText, fontSize: "0.8rem" }}>MID-0002</p>
          </div>
          <div>
            <p style={{ fontSize: "0.85rem", color: mutedText }}>Pickup</p>
            <p style={{ fontSize: "0.9rem" }}>04/03/2026</p>
            <p style={{ fontSize: "0.8rem", color: subtleText }}>10:00–14:00</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <GoldButton size="sm" onClick={() => onNext("done")}>Complete Pickup</GoldButton>
            <DangerButton size="sm">Cancel</DangerButton>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DoneView({ onReset }: { onReset: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 0" }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          backgroundColor: "rgba(196, 160, 85, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1.5rem",
        }}
      >
        <CheckIcon size={40} />
      </div>
      <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>
        Pickup Complete!
      </h1>
      <p style={{ color: subtleText, fontSize: "1rem", marginBottom: "0.5rem" }}>
        Transaction <span style={{ color: gold, fontWeight: 600 }}>TID-0001</span> created.
      </p>
      <p style={{ color: mutedText, fontSize: "0.9rem", marginBottom: "2rem" }}>
        Book is now &quot;Checked Out&quot; and the 21-day loan period has started.
      </p>
      <GoldButton onClick={onReset}>Replay Flow</GoldButton>
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────

function GoldButton({ children, onClick, size }: { children: React.ReactNode; onClick?: () => void; size?: "sm" }) {
  const pad = size === "sm" ? "0.4rem 1rem" : "0.65rem 1.5rem";
  const fs = size === "sm" ? "0.8rem" : "0.9rem";
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: gold,
        color: "#111",
        fontWeight: 700,
        fontSize: fs,
        padding: pad,
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        transition: "background-color 0.2s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = goldHover)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = gold)}
    >
      {children}
    </button>
  );
}

function OutlineButton({ children, onClick, size }: { children: React.ReactNode; onClick?: () => void; size?: "sm" }) {
  const pad = size === "sm" ? "0.4rem 1rem" : "0.65rem 1.5rem";
  const fs = size === "sm" ? "0.8rem" : "0.9rem";
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: "transparent",
        color: subtleText,
        fontWeight: 600,
        fontSize: fs,
        padding: pad,
        borderRadius: 8,
        border: `1px solid ${cardBorder}`,
        cursor: "pointer",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#555"; e.currentTarget.style.color = "#fff"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.color = subtleText; }}
    >
      {children}
    </button>
  );
}

function DangerButton({ children, onClick, size }: { children: React.ReactNode; onClick?: () => void; size?: "sm" }) {
  const pad = size === "sm" ? "0.4rem 1rem" : "0.65rem 1.5rem";
  const fs = size === "sm" ? "0.8rem" : "0.9rem";
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        color: "#f87171",
        fontWeight: 600,
        fontSize: fs,
        padding: pad,
        borderRadius: 8,
        border: "1px solid rgba(239, 68, 68, 0.3)",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 12,
        padding: "1.25rem 1.5rem",
        marginBottom: "1rem",
      }}
    >
      {children}
    </div>
  );
}

function TabButton({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <div
      style={{
        padding: "0.5rem 0",
        fontSize: "0.9rem",
        fontWeight: 600,
        color: active ? "#fff" : mutedText,
        borderBottom: active ? `2px solid ${gold}` : "2px solid transparent",
        cursor: "pointer",
        marginBottom: -1,
        display: "flex",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Available: { bg: "rgba(34, 197, 94, 0.15)", color: "#4ade80" },
    "Pending Pickup": { bg: "rgba(234, 179, 8, 0.15)", color: "#facc15" },
    Approved: { bg: "rgba(34, 197, 94, 0.15)", color: "#4ade80" },
  };
  const s = styles[status] || styles.Available;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.6rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: s.bg,
        color: s.color,
      }}
    >
      {status}
    </span>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: "0.75rem", color: mutedText, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p style={{ fontSize: "0.75rem", color: mutedText, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: "1.5rem", fontWeight: 800 }}>{value}</p>
    </Card>
  );
}

function FormField({ label, type, defaultValue, placeholder }: { label: string; type: string; defaultValue?: string; placeholder?: string }) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: 8,
    border: `1px solid ${cardBorder}`,
    backgroundColor: "#111",
    color: "#fff",
    fontSize: "0.9rem",
    outline: "none",
  };
  return (
    <div>
      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: subtleText, display: "block", marginBottom: 4 }}>{label}</label>
      {type === "textarea" ? (
        <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder={placeholder} />
      ) : (
        <input type={type} defaultValue={defaultValue} style={inputStyle} placeholder={placeholder} />
      )}
    </div>
  );
}

function ModalOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "1rem",
      }}
    >
      {children}
    </div>
  );
}

function AutoAdvance({ delay, onAdvance }: { delay: number; onAdvance: () => void }) {
  const [done, setDone] = useState(false);
  if (!done) {
    setTimeout(() => { setDone(true); onAdvance(); }, delay);
  }
  return null;
}

// ─── Icons (inline SVG) ──────────────────────────────────────────

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={subtleText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={subtleText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function BookIconSmall() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={subtleText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function CheckIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function stepDescription(step: Step): string {
  switch (step) {
    case "browse": return "Member views a book and decides to request checkout.";
    case "request": return "Submitting the checkout request...";
    case "requested": return "Request created. Book status is now 'Pending Pickup'. Admins have been notified.";
    case "admin-pending": return "Admin sees the pending request and can approve or deny it.";
    case "admin-approve": return "Admin sets a pickup date, time window, and optional notes.";
    case "admin-approved": return "Request approved. Member has been notified with pickup details.";
    case "member-approved": return "Member sees the approved request with pickup details on their dashboard.";
    case "admin-complete": return "Member arrives for pickup. Admin completes the transaction.";
    case "done": return "Transaction created. Book is checked out, due date starts now.";
  }
}
