import { useState, useEffect } from "react";
import { Scale, AlertTriangle, CheckCircle, Loader2, FileSearch, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface RiskyClause {
  clause: string;
  risk: string;
  suggestion: string;
}

interface SharedReviewData {
  id: number;
  title: string;
  riskScore: number;
  riskyClausesJson: string | null;
  summaryJson: string | null;
  createdAt: string;
}

function RiskScore({ score }: { score: number }) {
  const color = score <= 3 ? "text-green-400" : score <= 6 ? "text-yellow-400" : "text-red-400";
  const bgColor = score <= 3 ? "bg-green-400/10 border-green-400/20" : score <= 6 ? "bg-yellow-400/10 border-yellow-400/20" : "bg-red-400/10 border-red-400/20";
  const label = score <= 3 ? "Low Risk" : score <= 6 ? "Moderate Risk" : "High Risk";
  return (
    <div className={`flex flex-col items-center justify-center p-8 rounded-sm border ${bgColor}`}>
      <div className={`font-bold font-serif leading-none ${color}`} style={{ fontSize: "4rem" }}>{score}</div>
      <div className="text-muted-foreground text-sm mt-2">out of 10</div>
      <div className={`font-bold mt-3 tracking-wide uppercase text-sm ${color}`}>{label}</div>
    </div>
  );
}

function ClauseCard({ clause }: { clause: RiskyClause }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border rounded-sm bg-background overflow-hidden">
      <button
        className="w-full flex items-start justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-white font-medium line-clamp-2">{clause.clause}</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-2 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-2 flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div>
            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-1">Risk</p>
            <p className="text-sm text-muted-foreground">{clause.risk}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">Suggested Replacement</p>
            <p className="text-sm text-muted-foreground italic">{clause.suggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function SharedReviewPage({ token }: { token: string }) {
  const [data, setData] = useState<SharedReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/shared-reviews/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Not found");
        return r.json() as Promise<SharedReviewData>;
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  let riskyClauses: RiskyClause[] = [];
  let summary = "";
  if (data) {
    try { riskyClauses = JSON.parse(data.riskyClausesJson || "[]"); } catch {}
    try { summary = JSON.parse(data.summaryJson || "{}").summary || ""; } catch {}
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <span className="font-serif font-bold text-white tracking-tight">Clausly</span>
          <span className="text-muted-foreground text-sm ml-2">— Contract Risk Analysis</span>
        </div>
        <Badge variant="outline" className="border-border text-muted-foreground text-xs">Shared Report</Badge>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <FileSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h2 className="text-white font-semibold text-lg mb-2">Report not found</h2>
            <p className="text-muted-foreground text-sm">This shared link is invalid or the review has been deleted.</p>
          </div>
        )}

        {data && !loading && (
          <>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white">{data.title}</h1>
              <p className="text-xs text-muted-foreground mt-1">Analyzed {formatDate(data.createdAt)} · Shared via Clausly</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <Card className="bg-card border-border h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm font-semibold">Risk Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RiskScore score={data.riskScore} />
                  </CardContent>
                </Card>
              </div>
              <div className="md:col-span-2">
                <Card className="bg-card border-border h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm font-semibold">Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm leading-relaxed">{summary || "No summary available."}</p>
                    <Separator className="bg-border my-4" />
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <span className="text-white font-medium">{riskyClauses.length}</span>
                      <span className="text-muted-foreground">risky clauses identified</span>
                      {riskyClauses.length === 0 && <CheckCircle className="h-4 w-4 text-green-400 ml-2" />}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {riskyClauses.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    <CardTitle className="text-white text-base font-semibold">Flagged Clauses</CardTitle>
                    <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/20">{riskyClauses.length}</Badge>
                  </div>
                  <CardDescription className="text-muted-foreground text-sm">Click each clause to expand the risk explanation and suggested replacement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {riskyClauses.map((clause, i) => (
                    <ClauseCard key={i} clause={clause} />
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="text-center py-6 space-y-2">
              <p className="text-muted-foreground text-sm">Want to review your own contracts?</p>
              <a
                href="/"
                className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-sm font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Try Clausly Free
              </a>
              <p className="text-xs text-muted-foreground pt-2">
                Clausly — clausly.net · For informational purposes only.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
