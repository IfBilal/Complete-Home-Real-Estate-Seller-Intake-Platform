"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header>
      <div className="utility-bar">
        <div className="container utility-bar-inner">
          <div className="utility-bar-links">
            <span>(678) 815-9233</span>
            <span>support@completehome.com</span>
          </div>
          <span className="utility-bar-cta">Trusted by 470+ homeowners nationwide</span>
        </div>
      </div>
      <div className={`header${scrolled ? " header-scrolled" : ""}`}>
        <div className="container header-inner">
          <Link href="/" aria-label="Complete Home" className="brand">
            <Image
              src="/logo.jpeg"
              alt="Complete Home"
              className="brand-logo"
              width={44}
              height={44}
              priority
            />
            <div className="brand-text">
              <strong>Complete Home</strong>
              <span>Real Estate Experts</span>
            </div>
          </Link>
          <nav className="nav-links" aria-label="Primary">
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#benefits">Benefits</Link>
            <Link href="/#faq">FAQ</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
          <Link href="/intake" className="button-primary">
            Start Your Review
          </Link>
        </div>
      </div>
    </header>
  );
}
