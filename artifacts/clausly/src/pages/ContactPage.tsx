import { useState } from "react";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const fieldClass =
    "w-full rounded-lg bg-black/20 px-4 py-2.5 text-sm text-white placeholder:text-white/30 border-0 focus:outline-none focus:ring-2 focus:ring-primary/60 transition-all duration-200";
  const labelClass = "block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Clausly support request from ${name || "a visitor"}`);
    const body = encodeURIComponent(
      `${message}\n\n—\nName: ${name}\nEmail: ${email}`
    );
    window.location.href = `mailto:support@clausly.net?subject=${subject}&body=${body}`;
  }

  return (
    <LegalPageLayout title="Contact Us" lastUpdated="August 6, 2026">
      <p>
        Have a question, found a bug, or need help with your account? Reach us directly at{" "}
        <a href="mailto:support@clausly.net" className="inline-flex items-center gap-1.5">
          <Mail className="h-4 w-4" />
          support@clausly.net
        </a>{" "}
        or use the form below.
      </p>

      <form onSubmit={handleSubmit} className="not-prose mt-8 rounded-sm bg-card border border-border p-6 space-y-5">
        <div>
          <label className={labelClass}>Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
            placeholder="Your name"
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className={labelClass}>Message</label>
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={fieldClass}
            placeholder="How can we help?"
          />
        </div>
        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold w-full">
          Send Message
        </Button>
        <p className="text-xs text-muted-foreground">
          This opens your email client with your message pre-filled to support@clausly.net.
        </p>
      </form>
    </LegalPageLayout>
  );
}
