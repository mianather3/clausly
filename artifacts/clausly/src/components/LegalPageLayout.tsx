import { Link } from "wouter";
import { Scale, ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <Scale className="h-6 w-6 text-primary" />
            <span className="font-serif font-bold text-xl text-white tracking-tight">Clausly</span>
          </div>
        </Link>
        <Link href="/">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </span>
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-serif font-bold text-white mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-12">Last updated: {lastUpdated}</p>
        <div
          className="prose prose-invert prose-sm md:prose-base max-w-none
          prose-headings:font-serif prose-headings:text-white prose-headings:font-bold
          prose-p:text-muted-foreground prose-p:leading-relaxed
          prose-li:text-muted-foreground
          prose-strong:text-white
          prose-a:text-primary hover:prose-a:text-primary/80"
        >
          {children}
        </div>
      </main>

      <footer className="border-t border-border py-8 px-6 mt-12">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span className="font-serif font-bold text-white">Clausly</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/privacy"><span className="hover:text-white cursor-pointer">Privacy</span></Link>
            <Link href="/terms"><span className="hover:text-white cursor-pointer">Terms</span></Link>
            <Link href="/refund"><span className="hover:text-white cursor-pointer">Refunds</span></Link>
            <Link href="/contact"><span className="hover:text-white cursor-pointer">Contact</span></Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Clausly. For informational purposes only.</p>
        </div>
      </footer>
    </div>
  );
}
