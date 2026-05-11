export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}
        >
          <strong>Seller Intake</strong>
          <p style={{ maxWidth: "480px", color: "#D1D5DB", margin: 0 }}>
            A premium seller intake experience that keeps the process simple
            and transparent.
          </p>
          <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
            <a href="/privacy">Privacy</a>
            <a href="/intake">Seller Intake</a>
            <a href="/admin">Admin</a>
          </div>
          <span style={{ fontSize: "13px", color: "#9CA3AF" }}>
            © 2026 Real Estate Seller Intake. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
