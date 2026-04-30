import { useState } from "react";
import { Link } from "wouter";
import { useGetDocument } from "@workspace/api-client-react";
import { useAuth } from "@clerk/react";
import { ArrowLeft, Copy, Download, CheckCircle, FileText, FileType, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const DOC_TYPE_LABELS: Record<string, string> = {
  nda: "NDA",
  privacy_policy: "Privacy Policy",
  contractor_agreement: "Independent Contractor Agreement",
  terms_of_service: "Terms of Service",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function DocumentDetailPage({ id }: { id: string }) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [copied, setCopied] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const docId = parseInt(id, 10);
  const { data: doc, isLoading, error } = useGetDocument(docId, {
    query: { enabled: !!docId && !isNaN(docId) },
  });

  const handleCopy = () => {
    if (doc) {
      navigator.clipboard.writeText(doc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Document copied to clipboard." });
    }
  };

  const handleDownloadDocx = async () => {
    if (!doc) return;
    setDownloadingDocx(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/documents/download-docx`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: doc.title, content: doc.content }),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Download failed (${response.status}): ${errText.slice(0, 200)}`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("wordprocessingml")) {
        throw new Error(`Expected .docx but got ${contentType}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title.replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "_") || "document"}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Word document downloaded." });
    } catch (err) {
      toast({
        title: "Failed to download Word document.",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!doc) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Please allow popups to download PDF.", variant: "destructive" });
      return;
    }
    const escaped = doc.content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${doc.title}</title>
  <style>
    @page { margin: 1in; }
    body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.6; color: #1a1a1a; max-width: 100%; }
    h1.doc-title { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 24pt; }
    pre { white-space: pre-wrap; word-wrap: break-word; font-family: "Times New Roman", Times, serif; font-size: 12pt; }
  </style>
</head>
<body>
  <h1 class="doc-title">${doc.title}</h1>
  <pre>${escaped}</pre>
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`);
    printWindow.document.close();
    toast({ title: "PDF print dialog opened." });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="text-center py-16">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
        <h3 className="text-white font-semibold mb-2">Document not found</h3>
        <Link href="/documents">
          <Button variant="outline" className="border-border text-white hover:bg-secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documents
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/documents">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Documents
          </Button>
        </Link>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-white text-lg font-serif">{doc.title}</CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
              </Badge>
              <span className="text-xs text-muted-foreground">Generated {formatDate(doc.createdAt)}</span>
              {doc.partyA && <span className="text-xs text-muted-foreground">Party A: {doc.partyA}</span>}
              {doc.partyB && <span className="text-xs text-muted-foreground">Party B: {doc.partyB}</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="border-border text-white hover:bg-secondary gap-2"
            >
              {copied ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>

            <Button
              onClick={handleDownloadDocx}
              disabled={downloadingDocx}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold"
            >
              {downloadingDocx ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileType className="h-4 w-4" />
              )}
              {downloadingDocx ? "Generating..." : "Download Word (.docx)"}
            </Button>

            <Button
              onClick={handleDownloadPdf}
              variant="outline"
              size="sm"
              className="border-border text-white hover:bg-secondary gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-background border border-border rounded-sm p-6 max-h-[70vh] overflow-y-auto">
            <pre className="whitespace-pre-wrap font-serif text-sm text-white leading-relaxed">{doc.content}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
