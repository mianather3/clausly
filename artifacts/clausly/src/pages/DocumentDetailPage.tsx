import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useGetDocument } from "@workspace/api-client-react";
import { useAuth } from "@clerk/react";
import {
  ArrowLeft, Copy, Download, CheckCircle, FileText, FileType, Loader2,
  Send, PenLine, Clock, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface SigStatus {
  id: number;
  status: string;
  recipientEmail: string;
  recipientName: string | null;
  uniqueToken: string;
  createdAt: string;
  recipientSignedAt: string | null;
}

export default function DocumentDetailPage({ id }: { id: string }) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [copied, setCopied] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Signature state
  const [sigStatus, setSigStatus] = useState<SigStatus | null | undefined>(undefined);
  const [showSigModal, setShowSigModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [sendingSig, setSendingSig] = useState(false);

  const docId = parseInt(id, 10);
  const { data: doc, isLoading, error } = useGetDocument(docId, {
    query: { enabled: !!docId && !isNaN(docId) },
  });

  const fetchSigStatus = useCallback(async () => {
    if (!docId || isNaN(docId)) return;
    try {
      const token = await getToken();
      const r = await fetch(`/api/documents/${docId}/signature-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        setSigStatus(data);
      } else {
        setSigStatus(null);
      }
    } catch {
      setSigStatus(null);
    }
  }, [docId, getToken]);

  useEffect(() => { fetchSigStatus(); }, [fetchSigStatus]);

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: doc.title, content: doc.content }),
      });
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title.replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "_") || "document"}.docx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Word document downloaded." });
    } catch (err) {
      toast({ title: "Failed to download Word document.", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally { setDownloadingDocx(false); }
  };

  const handleDownloadPdf = async () => {
    if (!doc) return;
    setDownloadingPdf(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/documents/download-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: doc.title, content: doc.content }),
      });
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title.replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "_") || "document"}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "PDF downloaded." });
    } catch (err) {
      toast({ title: "Failed to download PDF.", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally { setDownloadingPdf(false); }
  };

  const handleSendForSignature = async () => {
    if (!recipientEmail.trim()) return;
    setSendingSig(true);
    try {
      const token = await getToken();
      const r = await fetch(`/api/documents/${docId}/request-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientEmail: recipientEmail.trim(), recipientName: recipientName.trim() || undefined }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Failed to send");
      }
      setShowSigModal(false);
      setRecipientEmail("");
      setRecipientName("");
      toast({ title: "Signature request sent!", description: `An email was sent to ${recipientEmail.trim()}.` });
      await fetchSigStatus();
    } catch (err) {
      toast({ title: "Failed to send signature request.", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally { setSendingSig(false); }
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

  const sigBadge = sigStatus === undefined ? null : sigStatus === null ? null : (
    sigStatus.status === "signed" ? (
      <Badge className="bg-green-400/10 text-green-400 border-green-400/20 gap-1">
        <CheckCircle className="h-3 w-3" />
        Signed by {sigStatus.recipientName || sigStatus.recipientEmail}
      </Badge>
    ) : (
      <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/20 gap-1">
        <Clock className="h-3 w-3" />
        Pending Signature · {sigStatus.recipientEmail}
      </Badge>
    )
  );

  return (
    <div className="max-w-4xl space-y-4">
      {/* Send for Signature modal */}
      {showSigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="bg-card border-border w-full max-w-md mx-4 shadow-2xl">
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <CardTitle className="text-white text-base font-semibold flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  Send for Signature
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">The recipient will receive an email with a link to sign the document.</p>
              </div>
              <button onClick={() => setShowSigModal(false)} className="text-muted-foreground hover:text-white mt-0.5">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white text-sm font-medium">Recipient Email *</Label>
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="bg-background border-border text-white placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white text-sm font-medium">Recipient Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  placeholder="Jane Smith"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="bg-background border-border text-white placeholder:text-muted-foreground"
                  onKeyDown={(e) => e.key === "Enter" && recipientEmail.trim() && handleSendForSignature()}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Electronic signatures collected through Clausly are legally binding under the E-SIGN Act and UETA.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleSendForSignature}
                  disabled={!recipientEmail.trim() || sendingSig}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold flex-1"
                >
                  {sendingSig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {sendingSig ? "Sending..." : "Send Request"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSigModal(false)}
                  className="border-border text-white hover:bg-secondary"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
            {sigBadge && <div className="mt-2">{sigBadge}</div>}
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
              {downloadingDocx ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileType className="h-4 w-4" />}
              {downloadingDocx ? "Generating..." : "Download Word (.docx)"}
            </Button>

            <Button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              variant="outline"
              size="sm"
              className="border-border text-white hover:bg-secondary gap-2"
            >
              {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloadingPdf ? "Generating..." : "Download PDF"}
            </Button>

            {sigStatus?.status !== "signed" && (
              <Button
                onClick={() => setShowSigModal(true)}
                variant="outline"
                size="sm"
                className="border-primary/40 text-primary hover:bg-primary/10 gap-2"
              >
                <PenLine className="h-4 w-4" />
                {sigStatus ? "Resend for Signature" : "Send for Signature"}
              </Button>
            )}
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
