import Link from "next/link";

export default function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" aria-label="Home" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "999px",
              background: "#2563EB",
              display: "inline-block"
            }}
          />
          <strong>Seller Intake</strong>
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
    </header>
  );
}
