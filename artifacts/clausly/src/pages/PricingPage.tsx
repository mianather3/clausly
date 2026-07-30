import { Link } from "wouter";
import { Scale, Check, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const FREE_FEATURES = [
  "1 document per month",
  "1 contract review per month",
  "AI risk scoring & flagged clauses",
  "AI Clause Explainer",
  "PDF and Word download",
  "Email support",
];

const STARTER_FEATURES = [
  "10 documents per month",
  "10 contract reviews per month",
  "All document types",
  "AI risk scoring & flagged clauses",
  "AI Clause Explainer",
  "5 e-signatures per month",
  "Save up to 5 templates",
  "PDF and Word download",
  "Email support",
];

const PRO_FEATURES = [
  "Unlimited documents",
  "Unlimited contract reviews",
  "All document types",
  "AI risk scoring & flagged clauses",
  "AI Clause Explainer",
  "Unlimited e-signatures",
  "Side-by-side contract comparison",
  "Unlimited document templates",
  "PDF and Word download (no watermark)",
  "Priority support",
  "Early access to new features",
];

const FAQS = [
  {
    question: "Is my data secure?",
    answer:
      "Yes. All documents and contract data are encrypted in transit and at rest. Your data is stored securely in our database and is never shared with third parties or used for AI training.",
  },
  {
    question: "Do I need a credit card for the free plan?",
    answer:
      "No. You can sign up and start using the free tier immediately — no credit card required. You only need to provide payment details when upgrading to Starter or Pro.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. There are no long-term contracts or cancellation fees. If you decide to cancel your subscription, you can do so at any time from your account settings and you won't be charged again.",
  },
  {
    question: "What's the difference between Starter and Pro?",
    answer:
      "Starter is built for freelancers and solopreneurs with moderate legal needs — 10 documents and 10 reviews per month covers most people. Pro is for founders and power users who need unlimited everything, contract comparison, and no watermark on downloads.",
  },
  {
    question: "Is Clausly a substitute for legal advice?",
    answer:
      "No. Clausly is an AI-powered drafting and analysis tool designed to help you understand and create legal documents — but it does not constitute legal advice and does not create an attorney-client relationship. Always consult a licensed attorney before signing any legal document.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 py-5">
      <button
        className="flex w-full items-center justify-between text-left gap-4"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-medium text-white">{question}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {open && (
        <p className="mt-3 text-muted-foreground text-sm leading-relaxed">{answer}</p>
      )}
    </div>
  );
}

export default function PricingPage() {
  const { toast } = useToast();

  const handleUpgradeClick = () => {
    toast({
      title: "Payment processing coming soon",
      description: "We'll notify you when paid plans launch.",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-white/10 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <Scale className="h-6 w-6 text-primary" />
              <span className="font-serif font-bold text-xl text-white">Clausly</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" className="text-muted-foreground hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-serif font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Start free. Upgrade when your legal needs grow.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-20">

          {/* Free tier */}
          <Card className="bg-card border-border relative">
            <CardHeader className="pb-4">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Free</p>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-muted-foreground mb-1 text-sm">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">Try Clausly with no commitment</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-white">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/sign-up">
                <Button variant="outline" className="w-full border-border text-white hover:bg-secondary">
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Starter tier */}
          <Card className="bg-card border-border relative">
            <CardHeader className="pb-4">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Starter</p>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-bold text-white">$19</span>
                <span className="text-muted-foreground mb-1 text-sm">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">For freelancers & solopreneurs</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {STARTER_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-white">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={handleUpgradeClick}
                variant="outline"
                className="w-full border-border text-white hover:bg-secondary"
              >
                Get Starter
              </Button>
            </CardContent>
          </Card>

          {/* Pro tier */}
          <Card className="bg-card border-primary/40 relative ring-1 ring-primary/40">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground font-semibold px-4 py-1">
                Most Popular
              </Badge>
            </div>
            <CardHeader className="pb-4">
              <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Pro</p>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-bold text-white">$49</span>
                <span className="text-muted-foreground mb-1 text-sm">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">For founders & power users</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-white">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={handleUpgradeClick}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>

          {/* Teams tier — Coming Soon */}
          <Card className="bg-card border-border relative opacity-75">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-secondary text-muted-foreground font-semibold px-4 py-1">
                Coming Soon
              </Badge>
            </div>
            <CardHeader className="pb-4">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Teams</p>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-bold text-white">$119</span>
                <span className="text-muted-foreground mb-1 text-sm">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">For agencies & growing businesses</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {[
                  "3 team seats included",
                  "Unlimited everything",
                  "Shared team workspace",
                  "Shared template library",
                  "White-label branding",
                  "Audit logs & activity tracking",
                  "Priority support (12hr SLA)",
                  "$25/seat for additional members",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                disabled
                variant="outline"
                className="w-full border-border text-muted-foreground cursor-not-allowed"
              >
                <Zap className="h-4 w-4 mr-2" />
                Notify Me
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-serif font-bold text-white text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div>
            {FAQS.map((faq) => (
              <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
