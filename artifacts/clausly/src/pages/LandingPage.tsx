import { useState } from "react";
import { Link } from "wouter";
import { Scale, FileText, FileSearch, Shield, CheckCircle, ArrowRight, Zap, Lock, Globe, AlertTriangle, Play, X } from "lucide-react";
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

const SAMPLE_NDA = `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of May 2, 2026 (the "Effective Date"), by and between Horizon Technologies Inc., a Delaware corporation with its principal place of business at 1200 Innovation Drive, San Francisco, California 94105 ("Horizon"), and Apex Solutions LLC, a Texas limited liability company with its principal place of business at 450 Commerce Street, Suite 800, Austin, Texas 78701 ("Apex").

RECITALS

WHEREAS, Horizon and Apex (each a "Party" and collectively the "Parties") desire to explore a potential business relationship in connection with the development and integration of Horizon's proprietary AI-driven data analytics platform (the "Permitted Purpose");

WHEREAS, in connection with the Permitted Purpose, each Party may disclose to the other certain confidential and proprietary information; and

WHEREAS, the Parties desire to protect such confidential information on the terms set forth herein.

NOW, THEREFORE, in consideration of the mutual covenants and agreements set forth below, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:

1. DEFINITIONS

"Confidential Information" means any and all written, oral, electronic, or tangible information disclosed by either Party (the "Disclosing Party") to the other Party (the "Receiving Party") in connection with the Permitted Purpose, including without limitation trade secrets, business plans, financial data, technical specifications, source code, customer lists, marketing strategies, and any other information that a reasonable person would consider confidential given the nature of the information and the circumstances of disclosure.

"Representatives" means a Party's employees, directors, officers, attorneys, accountants, and advisors who have a legitimate need to know the Confidential Information and who are bound by obligations of confidentiality no less restrictive than those set forth in this Agreement.

2. OBLIGATIONS OF CONFIDENTIALITY

2.1 Each Receiving Party shall: (a) maintain all Confidential Information in strict confidence; (b) not disclose Confidential Information to any person or entity other than its Representatives; (c) use Confidential Information solely for the Permitted Purpose; (d) promptly notify the Disclosing Party upon discovering any unauthorized disclosure; and (e) protect Confidential Information using at least the same degree of care it uses to protect its own confidential information, but in no event less than reasonable care.

3. EXCLUSIONS

Confidential Information does not include information that: (a) is or becomes publicly available through no breach by the Receiving Party; (b) was known to the Receiving Party prior to disclosure, as evidenced in writing; (c) is independently developed by the Receiving Party without use of or reference to the Confidential Information; (d) is received from a third party under no obligation of confidentiality; or (e) is required to be disclosed by applicable law or court order, provided the Receiving Party gives prompt written notice and cooperates with the Disclosing Party's efforts to obtain a protective order.

4. OWNERSHIP

All Confidential Information remains the sole and exclusive property of the Disclosing Party. This Agreement grants no license, right, or interest in any patent, copyright, trademark, trade secret, or other intellectual property right of the Disclosing Party.

5. RETURN OF CONFIDENTIAL INFORMATION

Upon termination of this Agreement or written request by the Disclosing Party, the Receiving Party shall promptly (within ten (10) business days) return or certifiably destroy all Confidential Information and all copies, summaries, and extracts thereof, and provide written certification of destruction upon request.

6. TERM AND TERMINATION

This Agreement shall commence on the Effective Date and continue for a period of three (3) years, unless earlier terminated by either Party upon thirty (30) days' written notice. The confidentiality obligations set forth herein shall survive termination for a period of five (5) years.

7. INDEMNIFICATION

The breaching Party shall indemnify, defend, and hold harmless the non-breaching Party and its officers, directors, employees, and agents from and against all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from any breach of this Agreement.

8. REMEDIES

The Parties acknowledge that any breach of this Agreement would cause irreparable harm for which monetary damages would be an inadequate remedy. Accordingly, the Disclosing Party shall be entitled to seek specific performance and injunctive or other equitable relief, without the necessity of posting bond or proving actual damages, in addition to all other remedies available at law or in equity.

9. DISPUTE RESOLUTION

This Agreement shall be governed by the laws of the State of Delaware, without regard to its conflict of laws principles. The Parties shall first attempt to resolve any dispute through good-faith negotiation for a period of thirty (30) days before initiating any legal proceedings. Exclusive jurisdiction and venue shall be in the state and federal courts located in the State of Delaware.

10. GENERAL

(a) This Agreement may be amended only by a written instrument signed by both Parties. (b) Failure to enforce any provision shall not constitute a waiver. (c) This Agreement may be executed in counterparts; electronic signatures are valid. (d) If any provision is held unenforceable, the remaining provisions shall continue in full force. (e) Neither Party may assign this Agreement without the prior written consent of the other, except in connection with a merger or acquisition. (f) This Agreement constitutes the entire agreement between the Parties with respect to its subject matter and supersedes all prior agreements and understandings relating thereto.

SIGNATURE BLOCK

HORIZON TECHNOLOGIES INC.
By: ________________________________
Name: ________________________________
Title: ________________________________
Date: ________________________________

APEX SOLUTIONS LLC
By: ________________________________
Name: ________________________________
Title: ________________________________
Date: ________________________________`;

function DisclaimerBanner() {
  return (
    <div className="flex items-start gap-3 rounded-sm border border-amber-500/30 bg-amber-500/8 px-4 py-3">
      <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-200/80 leading-relaxed">
        <span className="font-semibold text-amber-300">Legal Disclaimer: </span>
        Clausly generates documents for informational purposes only. Nothing on this platform constitutes legal advice or creates an attorney-client relationship. Always consult a licensed attorney before executing any legal document.
      </p>
    </div>
  );
}

function DemoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-card border border-border rounded-sm w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-white font-serif font-bold text-lg">Sample NDA — Horizon Technologies Inc. & Apex Solutions LLC</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Sample Document</Badge>
              <p className="text-xs text-muted-foreground">Sign up to generate your own with your actual party names and terms.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors ml-4 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <pre className="whitespace-pre-wrap font-serif text-sm text-white/90 leading-relaxed">{SAMPLE_NDA}</pre>
        </div>

        <div className="p-4 border-t border-border flex-shrink-0 flex items-center justify-between gap-4 bg-card/80">
          <p className="text-xs text-muted-foreground">This is a pre-generated sample for demonstration purposes only.</p>
          <Link href="/sign-up">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
              Generate Your Own
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}

      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          <span className="font-serif font-bold text-xl text-white tracking-tight">Clausly</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pricing">
            <Button variant="ghost" className="text-muted-foreground hover:text-white">Pricing</Button>
          </Link>
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
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
          Generate attorney-quality NDAs, contractor agreements, privacy policies, and terms of service in 60 seconds — and review any contract for risky clauses with an AI-powered risk score.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/sign-up">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base px-8 py-6 h-auto">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10 text-base px-8 py-6 h-auto font-semibold"
            onClick={() => setShowDemo(true)}
          >
            <Play className="mr-2 h-5 w-5" />
            Try Demo
          </Button>
          <Link href="/sign-in">
            <Button size="lg" variant="ghost" className="text-muted-foreground hover:text-white text-base px-6 py-6 h-auto">
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/sign-up">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base px-10 py-6 h-auto">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10 text-base px-8 py-6 h-auto font-semibold"
              onClick={() => setShowDemo(true)}
            >
              <Play className="mr-2 h-5 w-5" />
              Try Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Legal Disclaimer */}
      <section className="border-t border-border py-8 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <DisclaimerBanner />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span className="font-serif font-bold text-white">Clausly</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Clausly. For informational purposes only.</p>
        </div>
      </footer>
    </div>
  );
}
