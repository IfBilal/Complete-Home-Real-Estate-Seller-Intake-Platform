import FAQAccordion from "../components/FAQAccordion";
import HeroResumeCard from "../components/HeroResumeCard";
import CountUp from "../components/CountUp";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-overlay" />
        <div className="container hero-content">
          <div className="hero-text reveal" style={{ "--delay": "80ms" } as React.CSSProperties}>
            <div className="hero-pill">Guided Seller Review · Private Market Access</div>
            <h1>
              Get a real offer on your home —{" "}
              <span>without the listing.</span>
            </h1>
            <p className="hero-subtext">
              Complete Home connects sellers directly to a private market review.
              No open houses, no repairs, no obligation.
            </p>
            <div className="hero-actions">
              <a className="button-primary" href="/intake">
                Start Your Review
              </a>
              <a className="button-secondary" href="#how-it-works">
                See How It Works
              </a>
            </div>
            <p className="hero-micro">Takes 10 minutes · Free · Save and resume anytime</p>
            <div className="hero-trust">
              <div className="hero-stars">★★★★★</div>
              <span>Trusted by 470+ homeowners nationwide</span>
            </div>
          </div>
          <div className="reveal" style={{ "--delay": "160ms" } as React.CSSProperties}>
            <HeroResumeCard />
          </div>
        </div>
        <div className="container hero-metrics">
          <div className="metric-card reveal" style={{ "--delay": "120ms" } as React.CSSProperties}>
            <span className="metric-icon">⏱</span>
            <div>
              <strong>48 hrs</strong>
              <span>Avg response time</span>
            </div>
          </div>
          <div className="metric-card reveal" style={{ "--delay": "200ms" } as React.CSSProperties}>
            <span className="metric-icon">🔒</span>
            <div>
              <strong>Private</strong>
              <span>Secure & encrypted</span>
            </div>
          </div>
          <div className="metric-card reveal" style={{ "--delay": "280ms" } as React.CSSProperties}>
            <span className="metric-icon">✓</span>
            <div>
              <strong>No obligation</strong>
              <span>100% free review</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-header reveal">
            <p className="section-eyebrow">Track Record</p>
            <h2>Proven results across 48 states</h2>
            <p>Clear timelines and consistent outcomes for every homeowner.</p>
          </div>
          <div className="metrics-grid">
            <div className="metrics-card reveal" style={{ "--delay": "80ms" } as React.CSSProperties}>
              <h3><CountUp target={470} suffix="+" /></h3>
              <p>Verified property reviews</p>
            </div>
            <div className="metrics-card reveal" style={{ "--delay": "140ms" } as React.CSSProperties}>
              <h3><CountUp target={48} /></h3>
              <p>States covered</p>
            </div>
            <div className="metrics-card reveal" style={{ "--delay": "200ms" } as React.CSSProperties}>
              <h3><CountUp target={48} suffix="h" /></h3>
              <p>Average offer turnaround</p>
            </div>
            <div className="metrics-card reveal" style={{ "--delay": "260ms" } as React.CSSProperties}>
              <h3>$<CountUp target={0} /></h3>
              <p>Cost to get reviewed</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section">
        <div className="container">
          <div className="section-header reveal">
            <p className="section-eyebrow">Simple Process</p>
            <h2>How it works</h2>
            <p>Three steps. No appointments, no strangers in your home.</p>
          </div>
          <div className="timeline">
            {[
              {
                n: "1",
                title: "Confirm your address",
                desc: "We prefill your property details from public records — square footage, year built, lot size, and bed/bath counts. You confirm in seconds.",
              },
              {
                n: "2",
                title: "Complete your walkthrough",
                desc: "Upload room-by-room photos and short videos from your phone. Our guided flow takes most sellers under 15 minutes.",
              },
              {
                n: "3",
                title: "Receive your expert offer",
                desc: "Our specialist team reviews your submission and responds with a comprehensive market analysis and private offer within 48 hours.",
              },
            ].map((step, i, arr) => (
              <div
                key={i}
                className="timeline-step reveal"
                style={{ "--delay": `${i * 100 + 80}ms` } as React.CSSProperties}
              >
                <div className="timeline-left">
                  <div className="timeline-dot">{step.n}</div>
                  {i < arr.length - 1 && <div className="timeline-connector" />}
                </div>
                <div className="timeline-body">
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="benefits" className="section section-alt">
        <div className="container benefits">
          <div className="benefits-text reveal">
            <h2>Designed for serious sellers</h2>
            <p>A premium intake experience that respects your time and privacy.</p>
            <ul>
              <li>Zero obligation — accept only if it works for you.</li>
              <li>Private market access — your home is never listed publicly.</li>
              <li>Skip staging, showings, and open houses entirely.</li>
              <li>Secure, encrypted uploads at every step.</li>
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

      <section className="section">
        <div className="container">
          <div className="section-header reveal">
            <p className="section-eyebrow">Testimonials</p>
            <h2>What homeowners say</h2>
            <p>Real sellers. Real results.</p>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial-card reveal" style={{ "--delay": "80ms" } as React.CSSProperties}>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-quote">
                &ldquo;I had an offer in hand within 36 hours. No open houses, no repairs required — just a fair offer and a smooth close. I wish I had found Complete Home sooner.&rdquo;
              </p>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: "#2563eb" }}>M</div>
                <div>
                  <p className="testimonial-name">Marcus W.</p>
                  <p className="testimonial-location">Austin, TX</p>
                </div>
              </div>
            </div>
            <div className="testimonial-card reveal" style={{ "--delay": "160ms" } as React.CSSProperties}>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-quote">
                &ldquo;The walkthrough took 20 minutes on my phone. Our analyst called the next morning. The whole thing felt incredibly professional and low-pressure.&rdquo;
              </p>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: "#7c3aed" }}>P</div>
                <div>
                  <p className="testimonial-name">Priya N.</p>
                  <p className="testimonial-location">Dallas, TX</p>
                </div>
              </div>
            </div>
            <div className="testimonial-card reveal" style={{ "--delay": "240ms" } as React.CSSProperties}>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-quote">
                &ldquo;We needed a quick, private sale due to a relocation. Complete Home made it completely effortless. Ten days from intake to closed.&rdquo;
              </p>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: "#0891b2" }}>D</div>
                <div>
                  <p className="testimonial-name">David & Carol C.</p>
                  <p className="testimonial-location">Houston, TX</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="section section-alt">
        <div className="container">
          <div className="section-header reveal">
            <h2>Common questions</h2>
            <p>Everything you need to know before you start.</p>
          </div>
          <FAQAccordion />
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-band-inner reveal">
          <div>
            <h2>Ready for a stress-free sale?</h2>
            <p>Get your free expert review — no listing, no obligation, no hassle.</p>
          </div>
          <a className="button-primary" href="/intake">
            Start Your Review
          </a>
        </div>
      </section>
    </main>
  );
}
