import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BlogPostPerformance {
  post_id: string;
  title: string;
  slug: string;
  page_views: number;
  unique_visitors: number;
  bounce_rate: number;
  organic_traffic: number;
  organic_pct: number;
}

export interface SignupBucket {
  week_start: string; // ISO date
  tenants: number;
  landlords: number;
  agencies: number;
  total: number;
}

export interface CitySupply {
  city: string;
  state: string;
  count: number;
}

export interface FunnelStep {
  label: string;
  count: number;
  drop_pct: number | null;
}

export interface ReferralHealth {
  invites_sent: number;
  signups_attributed: number;
  housed_and_paid: number;
  conversion_pct: number;
}

export interface GrowthTractionData {
  topPosts: BlogPostPerformance[];
  bottomPosts: BlogPostPerformance[];
  signupTrend: SignupBucket[];
  totalActiveProperties: number;
  newListingsThisWeek: number;
  vacancyRate: number;
  topCities: CitySupply[];
  funnel: FunnelStep[];
  referrals: ReferralHealth;
}

const startOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday-start
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const useGrowthTractionMetrics = () => {
  return useQuery({
    queryKey: ['growth-traction-metrics'],
    queryFn: async (): Promise<GrowthTractionData> => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // 1. Blog SEO performance — last 30 days
      const { data: analytics } = await supabase
        .from('blog_seo_analytics')
        .select('post_id, page_views, unique_visitors, bounce_rate, organic_traffic')
        .gte('metric_date', thirtyDaysAgo.toISOString().split('T')[0])
        .limit(5000);

      // Aggregate per post
      const aggMap = new Map<string, { views: number; visitors: number; bounceSum: number; bounceN: number; organic: number }>();
      for (const row of analytics || []) {
        const e = aggMap.get(row.post_id) || { views: 0, visitors: 0, bounceSum: 0, bounceN: 0, organic: 0 };
        e.views += row.page_views || 0;
        e.visitors += row.unique_visitors || 0;
        if (row.bounce_rate !== null) {
          e.bounceSum += Number(row.bounce_rate);
          e.bounceN += 1;
        }
        e.organic += row.organic_traffic || 0;
        aggMap.set(row.post_id, e);
      }

      const postIds = Array.from(aggMap.keys());
      const { data: postsMeta } = postIds.length
        ? await supabase
            .from('blog_posts')
            .select('id, title, slug')
            .in('id', postIds)
        : { data: [] as any[] };

      const metaMap = new Map((postsMeta || []).map((p: any) => [p.id, p]));

      const performances: BlogPostPerformance[] = Array.from(aggMap.entries()).map(([id, e]) => ({
        post_id: id,
        title: metaMap.get(id)?.title || '(unknown)',
        slug: metaMap.get(id)?.slug || '',
        page_views: e.views,
        unique_visitors: e.visitors,
        bounce_rate: e.bounceN ? e.bounceSum / e.bounceN : 0,
        organic_traffic: e.organic,
        organic_pct: e.views > 0 ? (e.organic / e.views) * 100 : 0,
      }));

      const sortedByViews = [...performances].sort((a, b) => b.page_views - a.page_views);
      const topPosts = sortedByViews.slice(0, 5);
      const bottomPosts = [...performances]
        .filter((p) => p.page_views > 0)
        .sort((a, b) => a.page_views - b.page_views)
        .slice(0, 10);

      // 2. Signup velocity — last 90 days, weekly buckets
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_type, created_at')
        .gte('created_at', ninetyDaysAgo.toISOString())
        .limit(10000);

      const buckets = new Map<string, SignupBucket>();
      for (const p of profiles || []) {
        const week = startOfWeek(new Date(p.created_at)).toISOString().split('T')[0];
        const b = buckets.get(week) || { week_start: week, tenants: 0, landlords: 0, agencies: 0, total: 0 };
        const ut = (p.user_type || '').toLowerCase();
        if (ut === 'tenant') b.tenants += 1;
        else if (ut === 'landlord' || ut === 'investor') b.landlords += 1;
        else if (ut === 'agency' || ut === 'agency_admin' || ut === 'caseworker') b.agencies += 1;
        b.total += 1;
        buckets.set(week, b);
      }
      const signupTrend = Array.from(buckets.values()).sort((a, b) =>
        a.week_start.localeCompare(b.week_start)
      );

      // 3. Unit supply
      const { count: totalActiveProperties } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: newListingsThisWeek } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString());

      const { count: totalProps } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true });

      const vacancyRate =
        totalProps && totalProps > 0
          ? ((totalActiveProperties || 0) / totalProps) * 100
          : 0;

      // Top cities by active unit count
      const { data: cityRows } = await supabase
        .from('properties')
        .select('city, state')
        .eq('status', 'active')
        .not('city', 'is', null)
        .limit(5000);

      const cityMap = new Map<string, CitySupply>();
      for (const r of cityRows || []) {
        const key = `${r.city}|${r.state}`;
        const existing = cityMap.get(key);
        if (existing) existing.count += 1;
        else cityMap.set(key, { city: r.city as string, state: (r.state as string) || '', count: 1 });
      }
      const topCities = Array.from(cityMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      // 4. Funnel (rough proxy from existing data)
      const totalSignups = profiles?.length || 0;
      const tenantSignups = (profiles || []).filter((p) => (p.user_type || '').toLowerCase() === 'tenant').length;

      const { count: completedTenantProfiles } = await supabase
        .from('tenant_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', ninetyDaysAgo.toISOString());

      const { count: applicationsCount } = await supabase
        .from('property_applications')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', ninetyDaysAgo.toISOString());

      const funnel: FunnelStep[] = [
        { label: 'Total signups (90d)', count: totalSignups, drop_pct: null },
        {
          label: 'Tenant signups',
          count: tenantSignups,
          drop_pct: totalSignups ? ((totalSignups - tenantSignups) / totalSignups) * 100 : null,
        },
        {
          label: 'Profile completed',
          count: completedTenantProfiles || 0,
          drop_pct: tenantSignups
            ? ((tenantSignups - (completedTenantProfiles || 0)) / tenantSignups) * 100
            : null,
        },
        {
          label: 'First application',
          count: applicationsCount || 0,
          drop_pct: completedTenantProfiles
            ? (((completedTenantProfiles || 0) - (applicationsCount || 0)) / (completedTenantProfiles || 1)) * 100
            : null,
        },
      ];

      // 5. Referral health
      const { count: invitesSent } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true });

      const { count: signupsAttributed } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .not('referred_user_id', 'is', null);

      const { count: housedAndPaid } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .not('first_payment_at', 'is', null);

      const referrals: ReferralHealth = {
        invites_sent: invitesSent || 0,
        signups_attributed: signupsAttributed || 0,
        housed_and_paid: housedAndPaid || 0,
        conversion_pct: invitesSent ? ((housedAndPaid || 0) / invitesSent) * 100 : 0,
      };

      return {
        topPosts,
        bottomPosts,
        signupTrend,
        totalActiveProperties: totalActiveProperties || 0,
        newListingsThisWeek: newListingsThisWeek || 0,
        vacancyRate,
        topCities,
        funnel,
        referrals,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
};
