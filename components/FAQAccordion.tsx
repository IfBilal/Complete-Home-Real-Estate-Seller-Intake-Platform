"use client";

import { useState } from "react";

const faqs = [
  {
    q: "How long does the intake take?",
    a: "Most sellers finish in 8–12 minutes, depending on how many rooms you upload.",
  },
  {
    q: "Is there any cost to get an offer?",
    a: "No. Our professional review and offer generation are completely free and carry zero obligation. You are never required to accept.",
  },
  {
    q: "Who sees my property data?",
    a: "Your data is encrypted and reviewed exclusively by our internal team of verified analysts. We do not list your home publicly or share your data with external third parties.",
  },
  {
    q: "What kind of photos should I upload?",
    a: "Clear, well-lit photos of each room and exterior areas. Our guided flow prompts you room by room so nothing gets missed.",
  },
  {
    q: "How will I receive my offer?",
    a: "Our team follows up directly within 48 hours of submission with a comprehensive review and a private market offer.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? " faq-item-open" : ""}`}>
      <button className="faq-question" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span className="faq-icon">{open ? "−" : "+"}</span>
      </button>
      <div className={`faq-answer${open ? " faq-answer-open" : ""}`}>
        <p>{a}</p>
      </div>
    </div>
  );
}

export default function FAQAccordion() {
  return (
    <div className="faq-accordion">
      {faqs.map((item) => (
        <FAQItem key={item.q} q={item.q} a={item.a} />
      ))}
    </div>
  );
}
