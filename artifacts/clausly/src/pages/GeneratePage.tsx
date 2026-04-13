import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { FileText, Copy, Download, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const DOC_TYPES = [
  { value: "nda", label: "Non-Disclosure Agreement (NDA)" },
  { value: "privacy_policy", label: "Privacy Policy" },
  { value: "contractor_agreement", label: "Independent Contractor Agreement" },
  { value: "terms_of_service", label: "Terms of Service" },
];

export default function GeneratePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    documentType: "",
    partyA: "",
    partyB: "",
    keyTerms: "",
    jurisdiction: "",
    additionalContext: "",
  });
  const [generatedDoc, setGeneratedDoc] = useState<{ id: number; content: string; title: string } | null>(null);

  const mutation = useCreateDocument({
    mutation: {
      onSuccess: (data) => {
        setGeneratedDoc({ id: data.id, content: data.content, title: data.title });
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        toast({ title: "Document generated successfully." });
      },
      onError: () => {
        toast({ title: "Failed to generate document.", variant: "destructive" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.documentType || !form.partyA || !form.keyTerms) {
      toast({ title: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setGeneratedDoc(null);
    mutation.mutate({
      data: {
        documentType: form.documentType as any,
        partyA: form.partyA,
        partyB: form.partyB || undefined,
        keyTerms: form.keyTerms,
        jurisdiction: form.jurisdiction || undefined,
        additionalContext: form.additionalContext || undefined,
      },
    });
  };

  const handleCopy = () => {
    if (generatedDoc) {
      navigator.clipboard.writeText(generatedDoc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Document copied to clipboard." });
    }
  };

  const handleDownloadPDF = () => {
    if (!generatedDoc) return;
    const printContent = `
      <html>
        <head>
          <title>${generatedDoc.title}</title>
          <style>
            body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #1a1a1a; }
            pre { white-space: pre-wrap; font-family: Georgia, serif; font-size: 14px; }
            h1 { font-size: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
          </style>
        </head>
        <body>
          <h1>${generatedDoc.title}</h1>
          <pre>${generatedDoc.content}</pre>
        </body>
      </html>
    `;
    const blob = new Blob([printContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedDoc.title.replace(/[^a-z0-9]/gi, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Document downloaded." });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-white">Generate a Legal Document</h1>
        <p className="text-muted-foreground mt-1">Fill in the details below and let AI draft your document.</p>
      </div>

      {!generatedDoc ? (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white text-base font-semibold">Document Details</CardTitle>
            <CardDescription className="text-muted-foreground">Fields marked with * are required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-white text-sm font-medium">Document Type *</Label>
                <Select value={form.documentType} onValueChange={(val) => setForm((p) => ({ ...p, documentType: val }))}>
                  <SelectTrigger className="bg-background border-border text-white">
                    <SelectValue placeholder="Select a document type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-white focus:bg-secondary focus:text-white">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm font-medium">Party A (Your Organization) *</Label>
                  <Input
                    placeholder="e.g., Acme Corp, John Smith"
                    value={form.partyA}
                    onChange={(e) => setForm((p) => ({ ...p, partyA: e.target.value }))}
                    className="bg-background border-border text-white placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm font-medium">Party B (Other Party)</Label>
                  <Input
                    placeholder="e.g., Jane Doe, Vendor LLC"
                    value={form.partyB}
                    onChange={(e) => setForm((p) => ({ ...p, partyB: e.target.value }))}
                    className="bg-background border-border text-white placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white text-sm font-medium">Key Terms & Requirements *</Label>
                <Textarea
                  placeholder="Describe the key terms, duration, scope, compensation, restrictions, or any specific clauses you need included..."
                  value={form.keyTerms}
                  onChange={(e) => setForm((p) => ({ ...p, keyTerms: e.target.value }))}
                  className="bg-background border-border text-white placeholder:text-muted-foreground min-h-[100px]"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm font-medium">Jurisdiction</Label>
                  <Input
                    placeholder="e.g., California, USA / England and Wales"
                    value={form.jurisdiction}
                    onChange={(e) => setForm((p) => ({ ...p, jurisdiction: e.target.value }))}
                    className="bg-background border-border text-white placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm font-medium">Additional Context</Label>
                  <Input
                    placeholder="Any other details the AI should know..."
                    value={form.additionalContext}
                    onChange={(e) => setForm((p) => ({ ...p, additionalContext: e.target.value }))}
                    className="bg-background border-border text-white placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-5 h-auto"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating document...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Document
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <CardTitle className="text-white text-base font-semibold">Document Generated</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground mt-1">{generatedDoc.title}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCopy} variant="outline" size="sm" className="border-border text-white hover:bg-secondary gap-2">
                  {copied ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="border-border text-white hover:bg-secondary gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-background border border-border rounded-sm p-6 max-h-[60vh] overflow-y-auto">
                <pre className="whitespace-pre-wrap font-serif text-sm text-white leading-relaxed">{generatedDoc.content}</pre>
              </div>
            </CardContent>
          </Card>
          <Button
            onClick={() => { setGeneratedDoc(null); setForm({ documentType: "", partyA: "", partyB: "", keyTerms: "", jurisdiction: "", additionalContext: "" }); }}
            variant="outline"
            className="border-border text-white hover:bg-secondary"
          >
            Generate Another Document
          </Button>
        </div>
      )}
    </div>
  );
}
