import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Redirect } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, FileSearch, TrendingUp } from "lucide-react";

const ADMIN_EMAIL = "mianather783@gmail.com";

const DOC_TYPE_LABELS: Record<string, string> = {
  nda: "NDA",
  privacy_policy: "Privacy Policy",
  contractor_agreement: "Contractor Agreement",
  terms_of_service: "Terms of Service",
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function shortUserId(userId: string) {
  return userId.length > 20 ? `${userId.slice(0, 8)}…${userId.slice(-6)}` : userId;
}

interface AdminStats {
  totalUsers: number;
  totalDocuments: number;
  totalReviews: number;
  mostPopularDocType: string | null;
  docsPerDay: { day: string; count: number }[];
  userActivity: {
    userId: string;
    docCount: number;
    reviewCount: number;
    firstActivity: string;
    lastActivity: string;
  }[];
  recentDocuments: {
    id: number;
    title: string;
    documentType: string;
    userId: string;
    createdAt: string;
  }[];
  recentReviews: {
    id: number;
    title: string;
    riskScore: number;
    userId: string;
    createdAt: string;
  }[];
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const email = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isLoaded) return;
    if (!isAdmin) return;

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`${res.status}`);
        setStats(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, isAdmin, getToken]);

  if (!isLoaded) return null;
  if (!isAdmin) return <Redirect to="/" />;

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-serif font-bold text-white">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Platform-wide stats — visible only to you.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Users",
            value: stats?.totalUsers,
            icon: <Users className="h-5 w-5 text-primary" />,
          },
          {
            label: "Documents Generated",
            value: stats?.totalDocuments,
            icon: <FileText className="h-5 w-5 text-primary" />,
          },
          {
            label: "Contract Reviews",
            value: stats?.totalReviews,
            icon: <FileSearch className="h-5 w-5 text-primary" />,
          },
          {
            label: "Most Popular Type",
            value: stats?.mostPopularDocType
              ? DOC_TYPE_LABELS[stats.mostPopularDocType] ?? stats.mostPopularDocType
              : null,
            icon: <TrendingUp className="h-5 w-5 text-primary" />,
            isText: true,
          },
        ].map(({ label, value, icon, isText }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className={`font-bold text-white ${isText ? "text-lg" : "text-3xl"}`}>
                  {value ?? "—"}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documents Per Day Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base font-semibold">Documents Generated — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.docsPerDay ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" />
                <XAxis
                  dataKey="day"
                  tickFormatter={fmtShort}
                  tick={{ fill: "#8b95a8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#8b95a8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ background: "#1a2035", border: "1px solid #2a3050", borderRadius: 6 }}
                  labelStyle={{ color: "#e2e8f0", fontSize: 12 }}
                  itemStyle={{ color: "#c9a84c" }}
                  labelFormatter={(v) => fmt(v as string)}
                  formatter={(v) => [v, "Documents"]}
                />
                <Bar dataKey="count" fill="#c9a84c" radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base font-semibold">Recent Documents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">Title</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">User</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.recentDocuments ?? []).map((doc) => (
                      <tr key={doc.id} className="border-b border-border/50 hover:bg-background/40 transition-colors">
                        <td className="px-4 py-2 text-white truncate max-w-[140px]" title={doc.title}>{doc.title}</td>
                        <td className="px-4 py-2">
                          <Badge variant="outline" className="text-xs border-border text-muted-foreground whitespace-nowrap">
                            {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground font-mono text-xs truncate max-w-[100px]" title={doc.userId}>
                          {shortUserId(doc.userId)}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmt(doc.createdAt)}</td>
                      </tr>
                    ))}
                    {(stats?.recentDocuments ?? []).length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No documents yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base font-semibold">Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">Title</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">Risk</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">User</th>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.recentReviews ?? []).map((rev) => (
                      <tr key={rev.id} className="border-b border-border/50 hover:bg-background/40 transition-colors">
                        <td className="px-4 py-2 text-white truncate max-w-[140px]" title={rev.title}>{rev.title}</td>
                        <td className="px-4 py-2">
                          <span className={`font-bold text-sm ${
                            rev.riskScore >= 70 ? "text-red-400" :
                            rev.riskScore >= 40 ? "text-yellow-400" :
                            "text-green-400"
                          }`}>
                            {rev.riskScore}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground font-mono text-xs truncate max-w-[100px]" title={rev.userId}>
                          {shortUserId(rev.userId)}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmt(rev.createdAt)}</td>
                      </tr>
                    ))}
                    {(stats?.recentReviews ?? []).length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No reviews yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Activity Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base font-semibold">User Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">User ID</th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Documents</th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Reviews</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">First Activity</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.userActivity ?? []).map((u) => (
                    <tr key={u.userId} className="border-b border-border/50 hover:bg-background/40 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground" title={u.userId}>
                        {shortUserId(u.userId)}
                      </td>
                      <td className="px-4 py-2 text-right text-white font-semibold">{u.docCount}</td>
                      <td className="px-4 py-2 text-right text-white font-semibold">{u.reviewCount}</td>
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmt(u.firstActivity)}</td>
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmt(u.lastActivity)}</td>
                    </tr>
                  ))}
                  {(stats?.userActivity ?? []).length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No activity yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
