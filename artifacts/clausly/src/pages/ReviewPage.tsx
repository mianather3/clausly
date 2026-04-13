import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateReview, getListReviewsQueryKey } from "@workspace/api-client-react";
import { FileSearch, AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface RiskyClause {
  clause: string;
  risk: string;
  suggestion: string;
}

function RiskScore({ score }: { score: number }) {
  const color = score <= 3 ? "text-green-400" : score <= 6 ? "text-yellow-400" : "text-red-400";
  const bgColor = score <= 3 ? "bg-green-400/10 border-green-400/20" : score <= 6 ? "bg-yellow-400/10 border-yellow-400/20" : "bg-red-400/10 border-red-400/20";
  const label = score <= 3 ? "Low Risk" : score <= 6 ? "Medium Risk" : "High Risk";

  return (
    <div className={`flex flex-col items-center justify-center p-8 rounded-sm border ${bgColor}`}>
      <div className={`text-7xl font-bold font-serif ${color}`}>{score}</div>
      <div className="text-muted-foreground text-sm mt-1">out of 10</div>
      <div className={`text-lg font-semibold mt-3 ${color}`}>{label}</div>
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
          <div className="min-w-0">
            <p className="text-sm text-white font-medium line-clamp-2">{clause.clause}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
        )}
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

export default function ReviewPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [contractText, setContractText] = useState("");
  const [result, setResult] = useState<{
    id: number;
    riskScore: number;
    riskyClauses: RiskyClause[];
    summary: string;
  } | null>(null);

  const mutation = useCreateReview({
    mutation: {
      onSuccess: (data) => {
        let riskyClauses: RiskyClause[] = [];
        let summary = "";
        try { riskyClauses = JSON.parse(data.riskyClausesJson || "[]"); } catch {}
        try { summary = JSON.parse(data.summaryJson || "{}").summary || ""; } catch {}
        setResult({ id: data.id, riskScore: data.riskScore, riskyClauses, summary });
        queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
        toast({ title: "Contract analyzed successfully." });
      },
      onError: () => {
        toast({ title: "Failed to analyze contract.", variant: "destructive" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !contractText) {
      toast({ title: "Please provide a title and contract text.", variant: "destructive" });
      return;
    }
    setResult(null);
    mutation.mutate({ data: { title, contractText } });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-white">Review a Contract</h1>
        <p className="text-muted-foreground mt-1">Paste your contract text and get instant AI-powered risk analysis.</p>
      </div>

      {!result ? (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base font-semibold">Contract Analysis</CardTitle>
            <CardDescription className="text-muted-foreground">Paste the full contract text below for a comprehensive review.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white text-sm font-medium">Review Title *</Label>
                <Input
                  placeholder="e.g., Vendor Services Agreement Q1 2025"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-background border-border text-white placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm font-medium">Contract Text *</Label>
                <Textarea
                  placeholder="Paste the full contract text here..."
                  value={contractText}
                  onChange={(e) => setContractText(e.target.value)}
                  className="bg-background border-border text-white placeholder:text-muted-foreground min-h-[300px] font-mono text-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-5 h-auto"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing contract...
                  </>
                ) : (
                  <>
                    <FileSearch className="mr-2 h-4 w-4" />
                    Analyze Contract
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card className="bg-card border-border h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base font-semibold">Risk Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <RiskScore score={result.riskScore} />
                </CardContent>
              </Card>
            </div>
            <div className="md:col-span-2">
              <Card className="bg-card border-border h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base font-semibold">Overall Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">{result.summary}</p>
                  <Separator className="bg-border my-4" />
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <span className="text-white font-medium">{result.riskyClauses.length}</span>
                      <span className="text-muted-foreground">risky clauses found</span>
                    </div>
                    {result.riskyClauses.length === 0 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-muted-foreground">No significant risks detected</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {result.riskyClauses.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  <CardTitle className="text-white text-base font-semibold">Flagged Clauses</CardTitle>
                  <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/20">{result.riskyClauses.length}</Badge>
                </div>
                <CardDescription className="text-muted-foreground">Click each clause to see the risk explanation and suggested replacement.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.riskyClauses.map((clause, i) => (
                  <ClauseCard key={i} clause={clause} />
                ))}
              </CardContent>
            </Card>
          )}

          <Button
            onClick={() => { setResult(null); setTitle(""); setContractText(""); }}
            variant="outline"
            className="border-border text-white hover:bg-secondary"
          >
            Analyze Another Contract
          </Button>
        </div>
      )}
    </div>
  );
}
