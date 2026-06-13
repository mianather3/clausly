import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { GitCompare, Loader2, Trash2, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useListComparisons,
  useCreateComparison,
  useDeleteComparison,
  getListComparisonsQueryKey,
} from "@workspace/api-client-react";

interface Difference {
  topic: string;
  contractA: string;
  contractB: string;
}

interface MissingClause {
  clause: string;
  presentIn: "A" | "B";
}

interface Assessment {
  summary: string;
  favoredParty: string;
  recommendation: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ComparisonPage() {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", contractAText: "", contractBText: "" });
  const [result, setResult] = useState<{
    differences: Difference[];
    missingClauses: MissingClause[];
    assessment: Assessment;
    title: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: comparisons, isLoading: comparisonsLoading } = useListComparisons();

  const createMutation = useCreateComparison({
    mutation: {
      onSuccess: (data) => {
        const diffs = data.differencesJson ? JSON.parse(data.differencesJson) : [];
        const missing = data.missingClausesJson ? JSON.parse(data.missingClausesJson) : [];
        const assessment = data.assessmentJson ? JSON.parse(data.assessmentJson) : {};
        setResult({ differences: diffs, missingClauses: missing, assessment, title: data.title });
        queryClient.invalidateQueries({ queryKey: getListComparisonsQueryKey() });
        toast({ title: "Comparison complete." });
      },
      onError: () => {
        toast({ title: "Failed to compare contracts.", variant: "destructive" });
      },
    },
  });

  const deleteMutation = useDeleteComparison();

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.contractAText.trim() || !form.contractBText.trim()) {
      toast({ title: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    setResult(null);
    createMutation.mutate({ data: { title: form.title, contractAText: form.contractAText, contractBText: form.contractBText } });
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const token = await getToken();
      await fetch(`/api/comparisons/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: getListComparisonsQueryKey() });
      toast({ title: "Comparison deleted." });
    } catch {
      toast({ title: "Failed to delete.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const loadComparison = (comp: NonNullable<typeof comparisons>[number]) => {
    const diffs = comp.differencesJson ? JSON.parse(comp.differencesJson) : [];
    const missing = comp.missingClausesJson ? JSON.parse(comp.missingClausesJson) : [];
    const assessment = comp.assessmentJson ? JSON.parse(comp.assessmentJson) : {};
    setResult({ differences: diffs, missingClauses: missing, assessment, title: comp.title });
    setForm({ title: comp.title, contractAText: comp.contractAText, contractBText: comp.contractBText });
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-white">Document Comparison</h1>
        <p className="text-muted-foreground mt-1">Paste two contracts to get an AI-powered side-by-side analysis.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input form */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-white text-base font-semibold">Compare Contracts</CardTitle>
              <CardDescription className="text-muted-foreground">Paste both contracts below and click Compare.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompare} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-white text-sm font-medium">Comparison Title *</Label>
                  <Input
                    placeholder="e.g., Vendor Agreement v1 vs v2"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className="bg-background border-border text-white placeholder:text-muted-foreground"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white text-sm font-medium">Contract A *</Label>
                    <Textarea
                      placeholder="Paste the first contract here..."
                      value={form.contractAText}
                      onChange={(e) => setForm((p) => ({ ...p, contractAText: e.target.value }))}
                      className="bg-background border-border text-white placeholder:text-muted-foreground min-h-[280px] font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white text-sm font-medium">Contract B *</Label>
                    <Textarea
                      placeholder="Paste the second contract here..."
                      value={form.contractBText}
                      onChange={(e) => setForm((p) => ({ ...p, contractBText: e.target.value }))}
                      className="bg-background border-border text-white placeholder:text-muted-foreground min-h-[280px] font-mono text-xs"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-5 h-auto"
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing contracts...</>
                  ) : (
                    <><GitCompare className="mr-2 h-4 w-4" />Compare Contracts</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Assessment */}
              <Card className="bg-card border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base font-semibold flex items-center gap-2">
                    <GitCompare className="h-4 w-4 text-primary" />
                    Overall Assessment — {result.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Summary</p>
                    <p className="text-sm text-white leading-relaxed">{result.assessment.summary}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Favorability</p>
                    <p className="text-sm text-white leading-relaxed">{result.assessment.favoredParty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Recommendation</p>
                    <p className="text-sm text-white leading-relaxed">{result.assessment.recommendation}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Key differences */}
              {result.differences.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-base font-semibold">Key Differences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {result.differences.map((diff, i) => (
                        <div key={i} className="py-4 first:pt-0 last:pb-0">
                          <p className="text-sm font-semibold text-primary mb-3">{diff.topic}</p>
                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="bg-background rounded-sm p-3">
                              <p className="text-xs text-muted-foreground font-medium mb-1">Contract A</p>
                              <p className="text-sm text-white leading-relaxed">{diff.contractA}</p>
                            </div>
                            <div className="bg-background rounded-sm p-3">
                              <p className="text-xs text-muted-foreground font-medium mb-1">Contract B</p>
                              <p className="text-sm text-white leading-relaxed">{diff.contractB}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Missing clauses */}
              {result.missingClauses.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-base font-semibold">Clauses Present in One Contract Only</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.missingClauses.map((mc, i) => (
                        <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                          <Badge
                            variant="outline"
                            className={`flex-shrink-0 text-xs ${mc.presentIn === "A" ? "border-blue-500/40 text-blue-400" : "border-orange-500/40 text-orange-400"}`}
                          >
                            Contract {mc.presentIn} only
                          </Badge>
                          <p className="text-sm text-white">{mc.clause}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* History sidebar */}
        <div>
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold">Previous Comparisons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {comparisonsLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              ) : comparisons && comparisons.length > 0 ? (
                [...comparisons].reverse().map((comp) => (
                  <div
                    key={comp.id}
                    className="group flex items-start justify-between gap-2 p-2 rounded-sm hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => loadComparison(comp)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate font-medium">{comp.title}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{formatDate(comp.createdAt.toString())}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400"
                        onClick={(e) => { e.stopPropagation(); handleDelete(comp.id); }}
                        disabled={deletingId === comp.id}
                      >
                        {deletingId === comp.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No comparisons yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
