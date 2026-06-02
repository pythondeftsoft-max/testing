import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LinkClickData {
  link_url: string;
  link_text: string | null;
  click_count: number;
  is_external: boolean;
}

export interface LinkClickSummary {
  totalClicks: number;
  internalClicks: number;
  externalClicks: number;
  topLinks: LinkClickData[];
}

// Get session ID from localStorage or generate new one
export const getSessionId = (): string => {
  const storageKey = 'blog_session_id';
  let sessionId = localStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
};

// Track a link click
export const trackLinkClick = async (postId: string, linkUrl: string, linkText: string | null) => {
  try {
    const sessionId = getSessionId();
    
    await fetch('https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/blog-link-tracker', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postId,
        linkUrl,
        linkText,
        sessionId,
      }),
    });
  } catch (error) {
    // Silently fail - don't block navigation
    console.error('Failed to track link click:', error);
  }
};

// Hook for fetching link click analytics for a specific post
export const usePostLinkClicks = (postId: string | undefined) => {
  return useQuery({
    queryKey: ['post-link-clicks', postId],
    queryFn: async (): Promise<LinkClickSummary> => {
      if (!postId) {
        return { totalClicks: 0, internalClicks: 0, externalClicks: 0, topLinks: [] };
      }

      const { data, error } = await supabase
        .from('blog_link_clicks')
        .select('link_url, link_text')
        .eq('post_id', postId);

      if (error) throw error;

      // Aggregate clicks by URL
      const clickMap = new Map<string, { count: number; text: string | null }>();
      
      (data || []).forEach((click: any) => {
        const existing = clickMap.get(click.link_url);
        if (existing) {
          existing.count++;
        } else {
          clickMap.set(click.link_url, { count: 1, text: click.link_text });
        }
      });

      // Convert to array and sort by count
      const topLinks: LinkClickData[] = Array.from(clickMap.entries())
        .map(([url, { count, text }]) => ({
          link_url: url,
          link_text: text,
          click_count: count,
          is_external: isExternalLink(url),
        }))
        .sort((a, b) => b.click_count - a.click_count)
        .slice(0, 10);

      const totalClicks = data?.length || 0;
      const externalClicks = topLinks
        .filter(l => l.is_external)
        .reduce((sum, l) => sum + l.click_count, 0);
      const internalClicks = totalClicks - externalClicks;

      return {
        totalClicks,
        internalClicks,
        externalClicks,
        topLinks,
      };
    },
    enabled: !!postId,
  });
};

// Hook for fetching site-wide link click analytics
export const useSiteLinkClicks = (days: number = 30) => {
  return useQuery({
    queryKey: ['site-link-clicks', days],
    queryFn: async (): Promise<LinkClickSummary & { clicksByPost: Map<string, number> }> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('blog_link_clicks')
        .select('post_id, link_url, link_text')
        .gte('clicked_at', startDate.toISOString());

      if (error) throw error;

      // Aggregate clicks by URL
      const clickMap = new Map<string, { count: number; text: string | null }>();
      const clicksByPost = new Map<string, number>();
      
      (data || []).forEach((click: any) => {
        // Track by URL
        const existing = clickMap.get(click.link_url);
        if (existing) {
          existing.count++;
        } else {
          clickMap.set(click.link_url, { count: 1, text: click.link_text });
        }
        
        // Track by post
        const postCount = clicksByPost.get(click.post_id) || 0;
        clicksByPost.set(click.post_id, postCount + 1);
      });

      // Convert to array and sort by count
      const topLinks: LinkClickData[] = Array.from(clickMap.entries())
        .map(([url, { count, text }]) => ({
          link_url: url,
          link_text: text,
          click_count: count,
          is_external: isExternalLink(url),
        }))
        .sort((a, b) => b.click_count - a.click_count)
        .slice(0, 10);

      const totalClicks = data?.length || 0;
      const externalClicks = (data || []).filter((c: any) => isExternalLink(c.link_url)).length;
      const internalClicks = totalClicks - externalClicks;

      return {
        totalClicks,
        internalClicks,
        externalClicks,
        topLinks,
        clicksByPost,
      };
    },
  });
};

// Helper to determine if a URL is external
const isExternalLink = (url: string): boolean => {
  try {
    const linkUrl = new URL(url, window.location.origin);
    return linkUrl.hostname !== window.location.hostname;
  } catch {
    return false;
  }
};
