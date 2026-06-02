import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGrowthTractionMetrics } from '@/hooks/useGrowthTractionMetrics';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  FileText,
  Gift,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

const fmtPct = (n: number | null) =>
  n === null ? '—' : `${n.toFixed(1)}%`;

const GrowthTractionPage = () => {
  const { data, isLoading } = useGrowthTractionMetrics();

  if (isLoading || !data) {
    return (
      <AdminLayout activeTab="growth-traction">
        <div className="p-6 space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  const totalSignups90d = data.signupTrend.reduce((s, b) => s + b.total, 0);
  const lastWeek = data.signupTrend[data.signupTrend.length - 1]?.total || 0;
  const prevWeek = data.signupTrend[data.signupTrend.length - 2]?.total || 0;
  const wow = prevWeek ? ((lastWeek - prevWeek) / prevWeek) * 100 : 0;

  return (
    <AdminLayout activeTab="growth-traction">
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Growth Traction</h1>
          <p className="text-muted-foreground mt-1">
            The numbers you check every Monday. Last 30–90 days.
          </p>
        </div>

        {/* Top KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Signups (90d)
              </CardDescription>
              <CardTitle className="text-3xl">{totalSignups90d}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-sm flex items-center gap-1 ${wow >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {wow >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {fmtPct(wow)} WoW
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Active Units
              </CardDescription>
              <CardTitle className="text-3xl">{data.totalActiveProperties}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                +{data.newListingsThisWeek} new this week
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Top Post Views
              </CardDescription>
              <CardTitle className="text-3xl">
                {data.topPosts[0]?.page_views || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground line-clamp-1">
                {data.topPosts[0]?.title || 'No data yet'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Gift className="h-4 w-4" /> Referrals Housed
              </CardDescription>
              <CardTitle className="text-3xl">{data.referrals.housed_and_paid}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {data.referrals.invites_sent} invites · {fmtPct(data.referrals.conversion_pct)} conv
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Blog/SEO */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Blog & SEO Performance (30d)
              <Link to="/admin?tab=blog">
                <Button variant="outline" size="sm">Open Content Center <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </Link>
            </CardTitle>
            <CardDescription>Top 5 by page views; bottom 10 underperformers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Top Performers
              </h3>
              {data.topPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No analytics data in the last 30 days.</p>
              ) : (
                <div className="space-y-2">
                  {data.topPosts.map((p) => (
                    <div key={p.post_id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <Link to={`/blog/${p.slug}`} className="font-medium text-foreground hover:text-primary line-clamp-1">
                          {p.title}
                        </Link>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span>{p.page_views} views</span>
                          <span>{p.unique_visitors} visitors</span>
                          <span>{fmtPct(p.bounce_rate)} bounce</span>
                          <span>{fmtPct(p.organic_pct)} organic</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {data.bottomPosts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" /> Underperformers — candidates for refresh or unpublish
                </h3>
                <div className="space-y-2">
                  {data.bottomPosts.map((p) => (
                    <div key={p.post_id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <Link to={`/blog/${p.slug}`} className="text-sm text-foreground hover:text-primary line-clamp-1">
                          {p.title}
                        </Link>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span>{p.page_views} views</span>
                          <span>{fmtPct(p.bounce_rate)} bounce</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signups trend */}
        <Card>
          <CardHeader>
            <CardTitle>Signup Velocity (90d, weekly)</CardTitle>
            <CardDescription>Tenants vs Landlords vs Agencies</CardDescription>
          </CardHeader>
          <CardContent>
            {data.signupTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No signups in the last 90 days.</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground border-b border-border pb-2">
                  <span>Week of</span>
                  <span className="text-right">Tenants</span>
                  <span className="text-right">Landlords</span>
                  <span className="text-right">Agencies</span>
                  <span className="text-right">Total</span>
                </div>
                {data.signupTrend.slice().reverse().slice(0, 13).map((b) => (
                  <div key={b.week_start} className="grid grid-cols-5 gap-2 text-sm py-1">
                    <span className="text-muted-foreground">{b.week_start}</span>
                    <span className="text-right">{b.tenants}</span>
                    <span className="text-right">{b.landlords}</span>
                    <span className="text-right">{b.agencies}</span>
                    <span className="text-right font-semibold text-foreground">{b.total}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Tenant Funnel (90d)</CardTitle>
            <CardDescription>Where users drop off</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.funnel.map((step, i) => (
                <div key={step.label} className="flex items-center gap-4">
                  <span className="w-48 text-sm font-medium text-foreground">{step.label}</span>
                  <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{
                        width: `${
                          data.funnel[0].count
                            ? Math.max(2, (step.count / data.funnel[0].count) * 100)
                            : 2
                        }%`,
                      }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-semibold text-foreground">{step.count}</span>
                  {step.drop_pct !== null && i > 0 && (
                    <Badge variant={step.drop_pct > 50 ? 'destructive' : 'secondary'} className="w-20 justify-center">
                      −{fmtPct(step.drop_pct)}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            {data.funnel[2]?.drop_pct && data.funnel[2].drop_pct > 60 && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  Profile completion drop-off is high. Consider simplifying the tenant onboarding flow.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top cities */}
        <Card>
          <CardHeader>
            <CardTitle>Unit Supply — Top 20 Cities</CardTitle>
            <CardDescription>Where the inventory is concentrated</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topCities.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No active units.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {data.topCities.map((c) => (
                  <div key={`${c.city}-${c.state}`} className="p-3 border border-border rounded-lg">
                    <div className="text-sm font-medium text-foreground line-clamp-1">{c.city}, {c.state}</div>
                    <div className="text-xs text-muted-foreground">{c.count} active units</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Referral Program Health
              <Link to="/admin?tab=points-referrals">
                <Button variant="outline" size="sm">Manage <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </Link>
            </CardTitle>
            <CardDescription>$100 housed-and-paid program</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-3xl font-bold text-foreground">{data.referrals.invites_sent}</div>
                <div className="text-sm text-muted-foreground">Invites sent</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{data.referrals.signups_attributed}</div>
                <div className="text-sm text-muted-foreground">Signups attributed</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">{data.referrals.housed_and_paid}</div>
                <div className="text-sm text-muted-foreground">Housed & paid ({fmtPct(data.referrals.conversion_pct)})</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default GrowthTractionPage;
