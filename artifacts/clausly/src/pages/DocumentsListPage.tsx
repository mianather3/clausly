import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListDocuments, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { FileText, Trash2, Eye, Plus, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const DOC_TYPE_LABELS: Record<string, string> = {
  nda: "NDA",
  privacy_policy: "Privacy Policy",
  contractor_agreement: "Contractor Agreement",
  terms_of_service: "Terms of Service",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DocumentsListPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: documents, isLoading } = useListDocuments();
  const deleteMutation = useDeleteDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        toast({ title: "Document deleted." });
      },
      onError: () => {
        toast({ title: "Failed to delete document.", variant: "destructive" });
      },
    },
  });

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate({ id });
    }
  };

  const sortedDocs = documents ? [...documents].reverse() : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">Documents</h1>
          <p className="text-muted-foreground mt-1">All your generated legal documents.</p>
        </div>
        <Link href="/generate">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="pt-4"><Skeleton className="h-16 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : sortedDocs.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-white font-semibold mb-1">No documents yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Generate your first legal document to get started.</p>
            <Link href="/generate">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                <Plus className="mr-2 h-4 w-4" />
                Generate Document
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedDocs.map((doc) => (
            <Link key={doc.id} href={`/documents/${doc.id}`}>
              <Card className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs border-border text-muted-foreground px-1.5 py-0">
                            {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(doc.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white h-8 px-2" asChild>
                        <span><Eye className="h-4 w-4" /></span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive h-8 px-2"
                        onClick={(e) => handleDelete(doc.id, e)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
