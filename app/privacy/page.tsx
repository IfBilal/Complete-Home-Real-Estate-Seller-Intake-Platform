export default function PrivacyPage() {
  return (
    <main className="container section">
      <div className="section-header reveal">
        <h2>Privacy & Terms</h2>
        <p>We treat your information with care, discretion, and transparency.</p>
      </div>
      <div className="info-card reveal" style={{ maxWidth: "760px", "--delay": "80ms" } as React.CSSProperties}>
        <h3>Data & Media Usage</h3>
        <p>
          Uploads are used solely for intake review and are never shared outside
          the internal team. You remain in control of your submission.
        </p>
        <p style={{ marginBottom: 0 }}>
          Need edits or removal? Contact support anytime and we’ll assist.
        </p>
      </div>
    </main>
  );
}
