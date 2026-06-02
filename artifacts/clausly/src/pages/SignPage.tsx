import { useState, useEffect } from "react";
import { Scale, FileText, CheckCircle, Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SignPageData {
  document: { id: number; title: string; content: string; documentType: string };
  signatureRequest: {
    id: number;
    status: string;
    recipientEmail: string;
    recipientName: string | null;
    recipientSignedAt: string | null;
  };
}

export default function SignPage({ token }: { token: string }) {
  const [data, setData] = useState<SignPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signedName, setSignedName] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/sign/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Not found");
        return r.json() as Promise<SignPageData>;
      })
      .then((d) => {
        setData(d);
        if (d.signatureRequest.status === "signed") {
          setSigned(true);
          setSignedName(d.signatureRequest.recipientName || "");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSign = async () => {
    if (!fullName.trim()) return;
    setSigning(true);
    try {
      const r = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim() }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      setSigned(true);
      setSignedName(fullName.trim());
      setShowConfirm(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to sign");
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <span className="font-serif font-bold text-white tracking-tight">Clausly</span>
        </div>
        {data && !signed && (
          <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/20">Signature Requested</Badge>
        )}
        {signed && (
          <Badge className="bg-green-400/10 text-green-400 border-green-400/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Signed
          </Badge>
        )}
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h2 className="text-white font-semibold text-lg mb-2">Link not found</h2>
            <p className="text-muted-foreground text-sm">This signature link is invalid or has expired.</p>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Status / Sign action card */}
            {signed ? (
              <Card className="bg-green-400/5 border-green-400/20">
                <CardContent className="pt-6 flex items-start gap-4">
                  <CheckCircle className="h-8 w-8 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-400 font-semibold text-lg">Document signed</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Signed by <span className="text-white font-medium">{signedName}</span> · A confirmation has been sent to {data.signatureRequest.recipientEmail}.
                    </p>
                    <p className="text-muted-foreground text-xs mt-2 italic">
                      Typed signature: "{signedName}" — legally binding under the E-SIGN Act and UETA.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : showConfirm ? (
              <Card className="bg-card border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base font-semibold flex items-center gap-2">
                    <PenLine className="h-5 w-5 text-primary" />
                    Sign Document
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    By typing your full legal name below and clicking "Sign Document", you agree that this constitutes your legally binding electronic signature on <strong className="text-white">{data.document.title}</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This electronic signature is legally valid under the U.S. Electronic Signatures in Global and National Commerce (E-SIGN) Act and the Uniform Electronic Transactions Act (UETA).
                  </p>
                  <div className="space-y-2">
                    <Label className="text-white text-sm font-medium">Your Full Legal Name *</Label>
                    <Input
                      placeholder="e.g., Jane Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-background border-border text-white placeholder:text-muted-foreground text-lg"
                      onKeyDown={(e) => e.key === "Enter" && fullName.trim() && handleSign()}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      This name will appear as your signature on the document.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSign}
                      disabled={!fullName.trim() || signing}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                    >
                      {signing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenLine className="mr-2 h-4 w-4" />}
                      {signing ? "Signing..." : "Sign Document"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowConfirm(false)}
                      className="border-border text-white hover:bg-secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="pt-6 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-white font-semibold">{data.document.title}</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Sent to {data.signatureRequest.recipientEmail} — review the document below and sign when ready.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowConfirm(true)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold flex-shrink-0"
                  >
                    <PenLine className="mr-2 h-4 w-4" />
                    Sign Document
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Document content */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-white font-serif text-lg">{data.document.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-background border border-border rounded-sm p-6 max-h-[65vh] overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-serif text-sm text-white leading-relaxed">{data.document.content}</pre>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center pb-6">
              Clausly — clausly.net · For informational purposes only. Not legal advice.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
