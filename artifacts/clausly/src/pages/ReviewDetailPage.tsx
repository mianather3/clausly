import { useState } from "react";
import { Link } from "wouter";
import { useGetReview, getGetReviewQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@clerk/react";
import {
  ArrowLeft, AlertTriangle, CheckCircle, FileSearch, ChevronDown, ChevronUp,
  Share2, Copy, Loader2, Link2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useUplAcknowledgment } from "@/hooks/useUplAcknowledgment";

interface RiskyClause {
  clause: string;
  risk: string;
  impact?: string;
  suggestion: string;
}

function RiskScore({ score }: { score: number }) {
  const color = score <= 3 ? "text-green-400" : score <= 6 ? "text-yellow-400" : "text-red-400";
  const bgColor = score <= 3 ? "bg-green-400/10 border-green-400/20" : score <= 6 ? "bg-yellow-400/10 border-yellow-400/20" : "bg-red-400/10 border-red-400/20";
  const label = score <= 3 ? "Low Risk" : score <= 6 ? "Moderate Risk" : "High Risk";
  return (
    <div className={`flex flex-col items-center justify-center p-8 rounded-lg border ${bgColor}`}>
      <div className={`font-bold font-serif leading-none ${color}`} style={{ fontSize: "4rem" }}>{score}</div>
      <div className="text-muted-foreground text-sm mt-2">out of 10</div>
      <div className={`font-bold mt-3 tracking-wide uppercase text-sm ${color}`}>{label}</div>
    </div>
  );
}

function ClauseCard({ clause }: { clause: RiskyClause }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopySuggestion = () => {
    navigator.clipboard.writeText(clause.suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast({ title: "Suggested clause copied to clipboard!" });
  };

  return (
    <div className="rounded-lg bg-black/20 overflow-hidden">
      <button
        className="w-full flex items-start justify-between p-4 text-left hover:bg-black/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-white font-medium line-clamp-2">{clause.clause}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/8 pt-3">
          <div>
            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-1">Risk</p>
            <p className="text-sm text-muted-foreground">{clause.risk}</p>
          </div>
          {clause.impact && (
            <div className="rounded-lg bg-primary/8 border border-primary/20 px-3 py-2.5">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">What This Means For You</p>
              <p className="text-sm text-white leading-relaxed">{clause.impact}</p>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">Suggested Replacement</p>
              <Button
                onClick={handleCopySuggestion}
                size="sm"
                variant="outline"
                className="border-border text-white hover:bg-secondary gap-1.5 h-7 px-2 text-xs flex-shrink-0"
              >
                {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground italic">{clause.suggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function ReviewDetailPage({ id }: { id: string }) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const { requireAcknowledgment, AcknowledgmentModal } = useUplAcknowledgment();
  const reviewId = parseInt(id, 10);
  const { data: review, isLoading, error } = useGetReview(reviewId, {
    query: { enabled: !!reviewId && !isNaN(reviewId), queryKey: getGetReviewQueryKey(reviewId) },
  });

  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  let riskyClauses: RiskyClause[] = [];
  let summary = "";
  if (review) {
    try { riskyClauses = JSON.parse(review.riskyClausesJson || "[]"); } catch {}
    try { summary = JSON.parse(review.summaryJson || "{}").summary || ""; } catch {}
  }

  const handleShare = async () => {
    setSharing(true);
    try {
      const token = await getToken();
      const r = await fetch(`/api/reviews/${reviewId}/share`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      const data = await r.json() as { token: string };
      setShareToken(data.token);
    } catch (err) {
      toast({ title: "Failed to generate share link.", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally { setSharing(false); }
  };

  const handleCopyLink = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/shared-review/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    toast({ title: "Link copied to clipboard!", description: "Anyone with this link can view the risk analysis." });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="text-center py-16">
        <FileSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
        <h3 className="text-white font-semibold mb-2">Review not found</h3>
        <Link href="/reviews">
          <Button variant="outline" className="border-border text-white hover:bg-secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Reviews
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-5">
      {AcknowledgmentModal}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/reviews">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />Reviews
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {shareToken ? (
            <>
              <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-muted-foreground max-w-xs truncate">
                <Link2 className="h-3 w-3 flex-shrink-0 text-primary" />
                <span className="truncate">{`${window.location.origin}/shared-review/${shareToken}`}</span>
              </div>
              <Button onClick={handleCopyLink} size="sm" variant="outline" className="border-border text-white hover:bg-secondary gap-2 flex-shrink-0">
                {copiedLink ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                {copiedLink ? "Copied!" : "Copy Link"}
              </Button>
            </>
          ) : (
            <Button onClick={() => requireAcknowledgment(handleShare)} disabled={sharing} size="sm" variant="outline" className="border-border text-white hover:bg-secondary gap-2">
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              {sharing ? "Generating..." : "Share Results"}
            </Button>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-xl font-serif font-bold text-white">{review.title}</h1>
        <p className="text-xs text-muted-foreground mt-1">Analyzed {formatDate(review.createdAt)}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <Card className="bg-card border-border h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold">Risk Score</CardTitle>
            </CardHeader>
            <CardContent>
              <RiskScore score={review.riskScore} />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card className="bg-card border-border h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-relaxed">{summary}</p>
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

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-semibold">Original Contract Text</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground leading-relaxed max-h-64 overflow-y-auto">
            {review.contractText}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
