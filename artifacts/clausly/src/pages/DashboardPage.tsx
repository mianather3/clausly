import { Link } from "wouter";
import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { FileText, FileSearch, TrendingUp, BookMarked, ArrowRight, Clock, GitCompare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const DOC_TYPE_LABELS: Record<string, string> = {
  nda: "NDA",
  privacy_policy: "Privacy Policy",
  contractor_agreement: "Contractor Agreement",
  terms_of_service: "Terms of Service",
};

function RiskBadge({ score }: { score: number }) {
  if (score <= 3) return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Low Risk ({score}/10)</Badge>;
  if (score <= 6) return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">Medium Risk ({score}/10)</Badge>;
  return <Badge className="bg-red-600/20 text-red-400 border-red-600/30">High Risk ({score}/10)</Badge>;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recent, isLoading: recentLoading } = useGetRecentActivity();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-white">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your legal document activity at a glance.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Documents</p>
                    <p className="text-3xl font-bold text-white mt-1">{stats?.totalDocuments ?? 0}</p>
                  </div>
                  <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Contract Reviews</p>
                    <p className="text-3xl font-bold text-white mt-1">{stats?.totalReviews ?? 0}</p>
                  </div>
                  <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center">
                    <FileSearch className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {stats?.avgRiskScore != null ? `${stats.avgRiskScore}/10` : "—"}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Templates</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {stats?.templateCount ?? 0}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center">
                    <BookMarked className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/generate">
          <Card className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-white">Generate a Document</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Create an NDA, Privacy Policy, Contractor Agreement, or Terms of Service.</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/review">
          <Card className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileSearch className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-white">Review a Contract</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Paste contract text and get AI risk analysis with flagged clauses.</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/compare">
          <Card className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <GitCompare className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-white">Compare Contracts</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Paste two contracts side-by-side for an AI-powered difference analysis.</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent documents */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-white font-semibold text-base">Recent Documents</CardTitle>
            <Link href="/documents">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white text-xs">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : recent?.documents && recent.documents.length > 0 ? (
              recent.documents.slice().reverse().slice(0, 5).map((doc) => (
                <Link key={doc.id} href={`/documents/${doc.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-sm hover:bg-secondary/50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs border-border text-muted-foreground px-1.5 py-0">
                            {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 ml-2">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No documents yet.</p>
                <Link href="/generate">
                  <Button variant="link" className="text-primary text-sm mt-1 p-0 h-auto">Generate your first document</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent reviews */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-white font-semibold text-base">Recent Reviews</CardTitle>
            <Link href="/reviews">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white text-xs">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : recent?.reviews && recent.reviews.length > 0 ? (
              recent.reviews.slice().reverse().slice(0, 5).map((review) => (
                <Link key={review.id} href={`/reviews/${review.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-sm hover:bg-secondary/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSearch className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{review.title}</p>
                        <RiskBadge score={review.riskScore} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 ml-2">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(review.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-8 text-center">
                <FileSearch className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
                <Link href="/review">
                  <Button variant="link" className="text-primary text-sm mt-1 p-0 h-auto">Review your first contract</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
