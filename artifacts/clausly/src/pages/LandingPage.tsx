import { Link } from "wouter";
import { Scale, FileText, FileSearch, Shield, CheckCircle, ArrowRight, Zap, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: FileText,
    title: "AI Document Generation",
    description: "Generate NDAs, Privacy Policies, Contractor Agreements, and Terms of Service in seconds — tailored to your specific parties and terms.",
  },
  {
    icon: FileSearch,
    title: "Contract Risk Analysis",
    description: "Paste any contract and get instant AI-powered analysis: flagged risky clauses, suggested replacements, and a 1-10 risk score.",
  },
  {
    icon: Shield,
    title: "Built for Professionals",
    description: "Clausly follows real legal drafting conventions — not boilerplate. Every document is structured, thorough, and jurisdiction-aware.",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "No waiting. No back-and-forth. Get a complete legal document or full contract review in under 60 seconds.",
  },
  {
    icon: Lock,
    title: "Secure & Private",
    description: "Your documents and contract data are stored securely and are only accessible to you — never shared or used for training.",
  },
  {
    icon: Globe,
    title: "Full Document History",
    description: "Every document you generate and every contract you review is saved to your dashboard for easy access and download.",
  },
];

const DOCUMENT_TYPES = [
  { label: "Non-Disclosure Agreement", desc: "Protect confidential information" },
  { label: "Privacy Policy", desc: "GDPR & CCPA compliant policies" },
  { label: "Independent Contractor Agreement", desc: "Clear contractor terms" },
  { label: "Terms of Service", desc: "Define your product rules" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          <span className="font-serif font-bold text-xl text-white tracking-tight">Clausly</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="ghost" className="text-muted-foreground hover:text-white">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <Badge variant="outline" className="mb-6 border-primary/40 text-primary bg-primary/10 px-4 py-1 text-sm font-medium">
          AI-Powered Legal Documents
        </Badge>
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight mb-6 tracking-tight">
          Enterprise-grade legal docs,
          <br />
          <span className="text-primary">without the enterprise price.</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Generate professionally structured legal documents and get instant AI contract analysis. 
          Built for founders, freelancers, and growing teams who can't afford to wait on lawyers.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/sign-up">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base px-8 py-6 h-auto">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline" className="border-border text-white hover:bg-secondary text-base px-8 py-6 h-auto">
              Sign In
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">No credit card required. Free to try.</p>
      </section>

      {/* Document types strip */}
      <section className="border-y border-border bg-card/50 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-8">Supported Document Types</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {DOCUMENT_TYPES.map((doc) => (
              <div key={doc.label} className="flex items-start gap-3 p-4 rounded-sm bg-card border border-border">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white text-sm">{doc.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{doc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">Everything you need. Nothing you don't.</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Two powerful tools that cover 90% of what a startup or freelancer needs from a lawyer.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="p-6 rounded-sm bg-card border border-border hover:border-primary/40 transition-colors">
              <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-card/30 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">Ready to protect your business?</h2>
          <p className="text-muted-foreground text-lg mb-8">Start generating documents and reviewing contracts today.</p>
          <Link href="/sign-up">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base px-10 py-6 h-auto">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span className="font-serif font-bold text-white">Clausly</span>
          </div>
          <p className="text-xs text-muted-foreground">
            For informational purposes only. Not a substitute for legal advice from a licensed attorney.
          </p>
        </div>
      </footer>
    </div>
  );
}
