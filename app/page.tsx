export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-overlay" />
        <div className="container hero-content">
          <div className="hero-text reveal" style={{ "--delay": "80ms" } as React.CSSProperties}>
            <div className="hero-pill">Private Seller Intake · Concierge Guided</div>
            <h1>
              Navigate your <span>seller journey</span> with precision.
            </h1>
            <p className="hero-subtext">
              A guided, mobile-first intake for homeowners who want a faster,
              more transparent path to a serious review.
            </p>
            <div className="hero-actions">
              <a className="button-primary" href="/intake">
                Start Seller Intake
              </a>
              <a className="button-secondary" href="#how-it-works">
                See How It Works
              </a>
            </div>
            <div className="hero-trust">
              <div className="hero-stars">★★★★★</div>
              <span>Trusted by 200+ homeowners nationwide</span>
            </div>
          </div>
          <div className="hero-card reveal" style={{ "--delay": "160ms" } as React.CSSProperties}>
            <div className="hero-card-image" />
            <div className="hero-card-body">
              <p className="hero-card-title">Willow Lane Residence</p>
              <p className="hero-card-meta">Austin, TX · 2,140 sqft</p>
              <div className="hero-card-row">
                <span>Intake progress</span>
                <strong>65%</strong>
              </div>
              <div className="hero-card-progress">
                <div className="hero-card-progress-fill" />
              </div>
              <p className="hero-card-note">
                Resume anytime on this device.
              </p>
            </div>
          </div>
        </div>
        <div className="container hero-metrics">
          <div className="metric-card reveal" style={{ "--delay": "120ms" } as React.CSSProperties}>
            <span className="metric-icon">⏱</span>
            <div>
              <strong>48 hrs</strong>
              <span>Avg review time</span>
            </div>
          </div>
          <div className="metric-card reveal" style={{ "--delay": "200ms" } as React.CSSProperties}>
            <span className="metric-icon">🔒</span>
            <div>
              <strong>Private</strong>
              <span>Secure uploads</span>
            </div>
          </div>
          <div className="metric-card reveal" style={{ "--delay": "280ms" } as React.CSSProperties}>
            <span className="metric-icon">✓</span>
            <div>
              <strong>No obligation</strong>
              <span>Transparent review</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-header reveal">
            <h2>Proven review velocity</h2>
            <p>Clear timelines and consistent outcomes across every intake.</p>
          </div>
          <div className="metrics-grid">
            <div className="metrics-card reveal" style={{ "--delay": "80ms" } as React.CSSProperties}>
              <span className="metrics-icon">📈</span>
              <h3>470+</h3>
              <p>Successful reviews</p>
            </div>
            <div className="metrics-card reveal" style={{ "--delay": "140ms" } as React.CSSProperties}>
              <span className="metrics-icon">👥</span>
              <h3>63</h3>
              <p>Advisor team members</p>
            </div>
            <div className="metrics-card reveal" style={{ "--delay": "200ms" } as React.CSSProperties}>
              <span className="metrics-icon">🏡</span>
              <h3>266+</h3>
              <p>Seller submissions</p>
            </div>
            <div className="metrics-card reveal" style={{ "--delay": "260ms" } as React.CSSProperties}>
              <span className="metrics-icon">⭐</span>
              <h3>213+</h3>
              <p>5‑star owner ratings</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section">
        <div className="container">
          <div className="section-header reveal">
            <h2>How it works</h2>
            <p>Guided steps, built to feel calm and efficient.</p>
          </div>
          <div className="card-grid">
            <div className="info-card reveal" style={{ "--delay": "80ms" } as React.CSSProperties}>
              <div className="info-icon">1</div>
              <h3>Confirm your address</h3>
              <p>We prefill property details to keep things accurate and fast.</p>
            </div>
            <div className="info-card reveal" style={{ "--delay": "140ms" } as React.CSSProperties}>
              <div className="info-icon">2</div>
              <h3>Capture your walkthrough</h3>
              <p>Upload room-by-room photos and short videos from your phone.</p>
            </div>
            <div className="info-card reveal" style={{ "--delay": "200ms" } as React.CSSProperties}>
              <div className="info-icon">3</div>
              <h3>Get reviewed quickly</h3>
              <p>Our team reviews and follows up with clear next steps.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="benefits" className="section section-alt">
        <div className="container benefits">
          <div className="benefits-text reveal">
            <h2>Designed for serious sellers</h2>
            <p>A premium intake experience that respects your time and privacy.</p>
            <ul>
              <li>Streamlined, calm, and straightforward.</li>
              <li>Clear prompts for every space.</li>
              <li>Secure uploads and private review.</li>
              <li>Resume anytime on this device.</li>
            </ul>
          </div>
          <div className="benefits-media reveal" style={{ "--delay": "140ms" } as React.CSSProperties}>
            <div className="benefits-image" />
            <div className="benefits-caption">
              Mobile-first uploads with large tap targets.
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="section">
        <div className="container">
          <div className="section-header reveal">
            <h2>Frequently asked questions</h2>
            <p>Everything you need to know before you start.</p>
          </div>
          <div className="faq-list reveal" style={{ "--delay": "80ms" } as React.CSSProperties}>
            <details open>
              <summary>How long does the intake take?</summary>
              <p>
                Most sellers finish in 8–12 minutes, depending on how many rooms
                you upload.
              </p>
            </details>
            <details>
              <summary>Can I save and finish later?</summary>
              <p>
                Yes. Your progress is saved locally in your browser so you can
                return anytime from the same device.
              </p>
            </details>
            <details>
              <summary>What kind of photos should I upload?</summary>
              <p>Clear, well-lit photos of each room and exterior areas are best.</p>
            </details>
            <details>
              <summary>How will I get updates?</summary>
              <p>
                We send an optional confirmation email after submission and
                follow up as your review progresses.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-band-inner reveal">
          <div>
            <h2>Ready for a premium intake experience?</h2>
            <p>Start your seller intake in minutes and stay in control.</p>
          </div>
          <a className="button-primary" href="/intake">
            Start Seller Intake
          </a>
        </div>
      </section>
    </main>
  );
}
