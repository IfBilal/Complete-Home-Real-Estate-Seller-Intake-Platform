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
        <p>
          Draft progress is saved locally in your browser, so you can resume an
          unfinished submission from the same device.
        </p>
        <p style={{ marginBottom: 0 }}>
          After submission, we may send an optional confirmation email and
          follow up with next steps. Need edits or removal? Contact support
          anytime and we’ll assist.
        </p>
      </div>
    </main>
  );
}
