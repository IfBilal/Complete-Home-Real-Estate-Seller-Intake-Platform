import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header>
      <div className="utility-bar">
        <div className="container utility-bar-inner">
          <div className="utility-bar-links">
            <span>Private seller intake · Concierge-guided review</span>
            <span>Secure uploads · 48 hr response</span>
          </div>
          <span className="utility-bar-cta">Trusted by 200+ homeowners</span>
        </div>
      </div>
      <div className="header">
        <div className="container header-inner">
          <Link
            href="/"
            aria-label="Home"
            className="brand"
          >
            <Image
              src="/logo.jpeg"
              alt="Seller Intake"
              className="brand-logo"
              width={44}
              height={44}
              priority
            />
            <div className="brand-text">
              <strong>Seller Intake</strong>
              <span>Real Estate Review</span>
            </div>
          </Link>
          <nav className="nav-links" aria-label="Primary">
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#benefits">Benefits</Link>
            <Link href="/#faq">FAQ</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
          <Link href="/intake" className="button-primary">
            Start Intake
          </Link>
        </div>
      </div>
    </header>
  );
}
