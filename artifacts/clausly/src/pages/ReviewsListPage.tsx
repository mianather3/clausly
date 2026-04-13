import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListReviews, useDeleteReview, getListReviewsQueryKey } from "@workspace/api-client-react";
import { FileSearch, Trash2, Eye, Plus, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

function RiskBadge({ score }: { score: number }) {
  if (score <= 3) return <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">Low Risk {score}/10</Badge>;
  if (score <= 6) return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 text-xs">Medium Risk {score}/10</Badge>;
  return <Badge className="bg-red-600/20 text-red-400 border-red-600/30 text-xs">High Risk {score}/10</Badge>;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ReviewsListPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: reviews, isLoading } = useListReviews();
  const deleteMutation = useDeleteReview({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
        toast({ title: "Review deleted." });
      },
      onError: () => {
        toast({ title: "Failed to delete review.", variant: "destructive" });
      },
    },
  });

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this review?")) {
      deleteMutation.mutate({ id });
    }
  };

  const sortedReviews = reviews ? [...reviews].reverse() : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">Contract Reviews</h1>
          <p className="text-muted-foreground mt-1">All your AI contract analyses.</p>
        </div>
        <Link href="/review">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            <Plus className="mr-2 h-4 w-4" />
            New Review
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
      ) : sortedReviews.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <FileSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-white font-semibold mb-1">No reviews yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Submit a contract to get your first AI risk analysis.</p>
            <Link href="/review">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                <Plus className="mr-2 h-4 w-4" />
                Review a Contract
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedReviews.map((review) => (
            <Link key={review.id} href={`/reviews/${review.id}`}>
              <Card className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileSearch className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{review.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <RiskBadge score={review.riskScore} />
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(review.createdAt)}
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
                        onClick={(e) => handleDelete(review.id, e)}
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
