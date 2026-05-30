import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <strong className="footer-brand-name">Complete Home</strong>
          <span className="footer-brand-sub">Real Estate Experts</span>
          <p className="footer-brand-desc">
            Providing homeowners with a faster, data-driven path to a private
            market review and a stress-free sale.
          </p>
          <div className="footer-contact">
            <span>(865) 235-1071</span>
            <span>chstenn@gmail.com</span>
          </div>
        </div>

        <div className="footer-nav-group">
          <p className="footer-nav-heading">Platform</p>
          <ul className="footer-nav-list">
            <li><Link href="/#how-it-works">How It Works</Link></li>
            <li><Link href="/#benefits">Benefits</Link></li>
            <li><Link href="/#faq">Common Questions</Link></li>
            <li><Link href="/intake">Start Your Review</Link></li>
          </ul>
        </div>

        <div className="footer-nav-group">
          <p className="footer-nav-heading">Company</p>
          <ul className="footer-nav-list">
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/admin">Staff Login</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span>© 2026 Complete Home Real Estate Experts. All rights reserved.</span>
          <div className="footer-bottom-links">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="#">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
