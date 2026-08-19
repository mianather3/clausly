import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useCreateDocument, getListDocumentsQueryKey, useListTemplates, useCreateTemplate, useDeleteTemplate, getListTemplatesQueryKey } from "@workspace/api-client-react";
import { FileText, Copy, Download, CheckCircle, FileType, Loader2, AlertTriangle, BookMarked, X, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUplAcknowledgment } from "@/hooks/useUplAcknowledgment";

const DOC_TYPES = [
  { value: "nda", label: "Non-Disclosure Agreement (NDA)" },
  { value: "privacy_policy", label: "Privacy Policy" },
  { value: "contractor_agreement", label: "Independent Contractor Agreement" },
  { value: "terms_of_service", label: "Terms of Service" },
];

// US states + DC. Swap this for a country list (or nest states under a US
// entry) when going international — the <select> markup below doesn't need
// to change, just this array.
const US_JURISDICTIONS = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

const fieldClass = "w-full rounded-lg bg-black/20 px-4 py-2.5 text-sm text-white placeholder:text-white/30 border-0 focus:outline-none focus:ring-2 focus:ring-primary/60 transition-all duration-200";
const labelClass = "block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5";

export default function GeneratePage() {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { requireAcknowledgment, AcknowledgmentModal } = useUplAcknowledgment();
  const [copied, setCopied] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [form, setForm] = useState({
    documentType: "",
    partyA: "",
    partyB: "",
    keyTerms: "",
    jurisdiction: "",
    additionalContext: "",
  });
  const [generatedDoc, setGeneratedDoc] = useState<{ id: number; content: string; title: string } | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { data: templates } = useListTemplates();

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

  const templateMutation = useCreateTemplate({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        setShowSaveModal(false);
        setTemplateName("");
        toast({ title: `Template "${data.name}" saved.` });
      },
      onError: () => {
        toast({ title: "Failed to save template.", variant: "destructive" });
      },
    },
  });

  const deleteTemplateMutation = useDeleteTemplate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        toast({ title: "Template deleted." });
      },
      onError: () => {
        toast({ title: "Failed to delete template.", variant: "destructive" });
      },
      onSettled: () => setDeletingId(null),
    },
  });

  const handleDeleteTemplate = () => {
    if (!selectedTemplateId) return;
    const t = templates?.find((t) => t.id === parseInt(selectedTemplateId, 10));
    if (!t) return;
    if (!window.confirm(`Delete template "${t.name}"? This can't be undone.`)) return;
    setDeletingId(t.id);
    deleteTemplateMutation.mutate(
      { id: t.id },
      { onSuccess: () => setSelectedTemplateId("") }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.documentType || !form.partyA || !form.keyTerms || !form.jurisdiction) {
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
        jurisdiction: form.jurisdiction,
        additionalContext: form.additionalContext || undefined,
      },
    });
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !form.documentType || !form.partyA || !form.keyTerms) return;
    setSavingTemplate(true);
    templateMutation.mutate({
      data: {
        name: templateName.trim(),
        documentType: form.documentType as any,
        partyA: form.partyA,
        jurisdiction: form.jurisdiction || undefined,
        keyTerms: form.keyTerms,
        additionalContext: form.additionalContext || undefined,
      },
    });
    setSavingTemplate(false);
  };

  const loadTemplate = (id: string) => {
    const t = templates?.find((t) => t.id === parseInt(id, 10));
    if (!t) return;
    setForm({
      documentType: t.documentType,
      partyA: t.partyA,
      partyB: "",
      keyTerms: t.keyTerms,
      jurisdiction: t.jurisdiction ?? "",
      additionalContext: t.additionalContext ?? "",
    });
    toast({ title: `Template "${t.name}" loaded.` });
  };

  const handleCopy = () => {
    if (generatedDoc) {
      navigator.clipboard.writeText(generatedDoc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Document copied to clipboard." });
    }
  };

  const handleDownloadDocx = async () => {
    if (!generatedDoc) return;
    setDownloadingDocx(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/documents/download-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: generatedDoc.title, content: generatedDoc.content }),
      });
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${generatedDoc.title.replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "_") || "document"}.docx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Word document downloaded." });
    } catch (err) {
      toast({ title: "Failed to download Word document.", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally { setDownloadingDocx(false); }
  };

  const handleDownloadPdf = async () => {
    if (!generatedDoc) return;
    setDownloadingPdf(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/documents/download-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: generatedDoc.title, content: generatedDoc.content }),
      });
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${generatedDoc.title.replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "_") || "document"}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "PDF downloaded." });
    } catch (err) {
      toast({ title: "Failed to download PDF.", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally { setDownloadingPdf(false); }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Save as Template modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="bg-card border-border w-full max-w-md mx-4 shadow-2xl">
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <CardTitle className="text-white text-base font-semibold flex items-center gap-2">
                  <BookMarked className="h-4 w-4 text-primary" />
                  Save as Template
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Saves your current form settings for reuse later.</p>
              </div>
              <button onClick={() => setShowSaveModal(false)} className="text-muted-foreground hover:text-white mt-0.5">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className={labelClass}>Template Name *</label>
                <input
                  className={fieldClass}
                  placeholder="e.g., Standard Vendor NDA"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && templateName.trim() && handleSaveTemplate()}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim() || savingTemplate || templateMutation.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold flex-1"
                >
                  {templateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookMarked className="mr-2 h-4 w-4" />}
                  Save Template
                </Button>
                <Button variant="outline" onClick={() => setShowSaveModal(false)} className="border-border text-white hover:bg-secondary">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {AcknowledgmentModal}

      <div>
        <h1 className="text-2xl font-serif font-bold text-white">Generate a Legal Document</h1>
        <p className="text-muted-foreground mt-1">Fill in the details below and let AI draft your document.</p>
      </div>

      <p className="text-xs text-muted-foreground">
        For informational purposes only — not legal advice. <a href="/terms" className="underline hover:text-white transition-colors">Learn more</a>
      </p>

      {!generatedDoc ? (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base font-semibold">Document Details</CardTitle>
            <CardDescription className="text-muted-foreground">Fields marked with * are required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Load / delete templates */}
              {templates && templates.length > 0 && (
                <div className="flex items-center gap-3 pb-4 border-b border-white/8">
                  <BookMarked className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <select
                      className={fieldClass}
                      value={selectedTemplateId}
                      onChange={(e) => {
                        setSelectedTemplateId(e.target.value);
                        if (e.target.value) {
                          loadTemplate(e.target.value);
                        } else {
                          setForm({ documentType: "", partyA: "", partyB: "", keyTerms: "", jurisdiction: "", additionalContext: "" });
                        }
                      }}
                    >
                      <option value="">Load a saved template...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={String(t.id)}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteTemplate}
                    disabled={!selectedTemplateId || deletingId !== null}
                    className="text-muted-foreground hover:text-red-400 disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors flex-shrink-0 p-2"
                    aria-label="Delete selected template"
                  >
                    {deletingId !== null ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}

              {/* Document Type */}
              <div>
                <label className={labelClass}>Document Type *</label>
                <select
                  className={fieldClass}
                  value={form.documentType}
                  onChange={(e) => setForm((p) => ({ ...p, documentType: e.target.value }))}
                >
                  <option value="">Select a document type</option>
                  {DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Party A & B */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Party A (Your Organization) *</label>
                  <input
                    className={fieldClass}
                    placeholder="e.g., Acme Corp, John Smith"
                    value={form.partyA}
                    onChange={(e) => setForm((p) => ({ ...p, partyA: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Party B (Other Party)</label>
                  <input
                    className={fieldClass}
                    placeholder="e.g., Jane Doe, Vendor LLC"
                    value={form.partyB}
                    onChange={(e) => setForm((p) => ({ ...p, partyB: e.target.value }))}
                  />
                </div>
              </div>

              {/* Key Terms */}
              <div>
                <label className={labelClass}>Key Terms & Requirements *</label>
                <textarea
                  className={`${fieldClass} min-h-[100px] resize-y`}
                  placeholder="Describe the key terms, duration, scope, compensation, restrictions, or any specific clauses you need included..."
                  value={form.keyTerms}
                  onChange={(e) => setForm((p) => ({ ...p, keyTerms: e.target.value }))}
                />
              </div>

              {/* Jurisdiction & Additional Context */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Jurisdiction *</label>
                  <select
                    className={fieldClass}
                    value={form.jurisdiction}
                    onChange={(e) => setForm((p) => ({ ...p, jurisdiction: e.target.value }))}
                  >
                    <option value="">Select a state</option>
                    {US_JURISDICTIONS.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Additional Context</label>
                  <input
                    className={fieldClass}
                    placeholder="Any other details the AI should know..."
                    value={form.additionalContext}
                    onChange={(e) => setForm((p) => ({ ...p, additionalContext: e.target.value }))}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending || !form.documentType || !form.partyA || !form.keyTerms || !form.jurisdiction}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-5 h-auto"
              >
                {mutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating document...</>
                ) : (
                  <><FileText className="mr-2 h-4 w-4" />Generate Document</>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                disabled={!form.documentType || !form.partyA || !form.keyTerms}
                onClick={() => setShowSaveModal(true)}
                className="w-full text-muted-foreground hover:text-white gap-2"
              >
                <BookMarked className="h-4 w-4" />
                Save form as Template
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <CardTitle className="text-white text-base font-semibold">Document Generated</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground mt-1">{generatedDoc.title}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <Button onClick={() => requireAcknowledgment(handleCopy)} variant="outline" size="sm" className="border-border text-white hover:bg-secondary gap-2">
                  {copied ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button onClick={() => requireAcknowledgment(handleDownloadDocx)} disabled={downloadingDocx} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold">
                  {downloadingDocx ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileType className="h-4 w-4" />}
                  {downloadingDocx ? "Generating..." : "Download Word (.docx)"}
                </Button>
                <Button onClick={() => requireAcknowledgment(handleDownloadPdf)} disabled={downloadingPdf} variant="outline" size="sm" className="border-border text-white hover:bg-secondary gap-2">
                  {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {downloadingPdf ? "Generating..." : "Download PDF"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap font-serif text-sm text-white leading-relaxed max-h-[60vh] overflow-y-auto">
                {generatedDoc.content}
              </pre>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button
              onClick={() => { setGeneratedDoc(null); setForm({ documentType: "", partyA: "", partyB: "", keyTerms: "", jurisdiction: "", additionalContext: "" }); }}
              variant="outline"
              className="border-border text-white hover:bg-secondary"
            >
              Generate Another Document
            </Button>
            <Button variant="ghost" onClick={() => setShowSaveModal(true)} className="text-muted-foreground hover:text-white gap-2">
              <BookMarked className="h-4 w-4" />
              Save as Template
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
