import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateReview, getListReviewsQueryKey } from "@workspace/api-client-react";
import { FileSearch, AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronUp, Upload, X, FileText } from "lucide-react";
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

async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).href;

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }
  return pages.join("\n\n");
}

async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export default function ReviewPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [contractText, setContractText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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

  const processFile = async (file: File) => {
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx");

    if (!isPdf && !isDocx) {
      toast({ title: "Only PDF and DOCX files are supported.", variant: "destructive" });
      return;
    }

    setUploadedFile(file);
    setIsExtracting(true);
    setContractText("");

    if (!title) {
      setTitle(file.name.replace(/\.(pdf|docx)$/i, ""));
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = isPdf
        ? await extractTextFromPdf(arrayBuffer)
        : await extractTextFromDocx(arrayBuffer);

      if (!text.trim()) {
        toast({ title: "Could not extract text from this file. Try pasting the text manually.", variant: "destructive" });
        setUploadedFile(null);
      } else {
        setContractText(text.trim());
        toast({ title: "File extracted successfully." });
      }
    } catch {
      toast({ title: "Failed to read file. Please try again or paste text manually.", variant: "destructive" });
      setUploadedFile(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const clearFile = () => {
    setUploadedFile(null);
    setContractText("");
  };

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
        <p className="text-muted-foreground mt-1">Upload a PDF or DOCX file, or paste your contract text, and get instant AI-powered risk analysis.</p>
      </div>

      {!result ? (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base font-semibold">Contract Analysis</CardTitle>
            <CardDescription className="text-muted-foreground">Upload a file or paste the full contract text below for a comprehensive review.</CardDescription>
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
                <Label className="text-white text-sm font-medium">Upload Contract File</Label>

                {uploadedFile ? (
                  <div className="flex items-center gap-3 p-3 rounded-sm border border-primary/40 bg-primary/5">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    {isExtracting ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
                    ) : (
                      <button
                        type="button"
                        onClick={clearFile}
                        className="text-muted-foreground hover:text-white transition-colors flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className={`relative border-2 border-dashed rounded-sm p-6 text-center transition-colors cursor-pointer ${
                      isDragging
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-secondary/20"
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-white font-medium">Drop a file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF and DOCX supported</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-white text-sm font-medium">Contract Text *</Label>
                  {contractText && (
                    <span className="text-xs text-muted-foreground">{contractText.length.toLocaleString()} characters</span>
                  )}
                </div>
                <Textarea
                  placeholder={isExtracting ? "Extracting text from file..." : "Paste the full contract text here, or upload a file above to auto-populate..."}
                  value={contractText}
                  onChange={(e) => {
                    setContractText(e.target.value);
                    if (uploadedFile && e.target.value !== contractText) setUploadedFile(null);
                  }}
                  disabled={isExtracting}
                  className="bg-background border-border text-white placeholder:text-muted-foreground min-h-[300px] font-mono text-sm disabled:opacity-60"
                />
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending || isExtracting}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-5 h-auto"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing contract...
                  </>
                ) : isExtracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting file text...
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
            onClick={() => { setResult(null); setTitle(""); setContractText(""); setUploadedFile(null); }}
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
