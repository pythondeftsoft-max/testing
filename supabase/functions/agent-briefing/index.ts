const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { notifyOwner, notifyOwnerBatch } from '../_shared/notify-owner.ts';

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1486406441970434171/_gKexHFBqO7cxp06Z1NHRVwSgvHQR-BH6_g6ALEqhRNmKMtkIGGOCneUgBPTMPzaAXOf';

const JUNK_DOMAINS = ['facebook.com', 'youtube.com', 'pinterest.com', 'tiktok.com', 'instagram.com', 'reddit.com', 'twitter.com', 'x.com'];
const MIN_CONTENT_LENGTH = 200;

const MARKET_CATEGORIES = [
  {
    id: 'housing',
    emoji: '🏠',
    title: 'HOUSING & RENTAL MARKET',
    queries: [
      'apartment rent prices 2026',
      'multifamily vacancy rate rental market',
      'housing market Dallas Houston Atlanta rent trends',
    ],
    timeFilter: 'qdr:w',
    prompt: `You are a market analyst briefing a Section 8 housing company CEO. Synthesize these articles into a comprehensive briefing about the housing and rental market.

IMPORTANT — WRITE THIS FIRST:
SMS_BRIEFING: Write 5-8 sentences (~600 characters) covering the top 3-4 housing developments with specific numbers and data points. Include actionable takeaways. No bullet points, no markdown bold — just a dense, informative paragraph. This will be sent via text message.

Then provide:
- 5-8 key bullet points with specific numbers (rent prices, vacancy rates, inventory numbers, city-level data)
- 3-4 detailed paragraphs of analysis covering:
  - What's shifting in the rental market nationally and in key metros (Dallas, Houston, Atlanta, etc.)
  - Where rents are heading and why (supply/demand, new construction, migration patterns)
  - Institutional buyer activity and what it means for small operators
  - What it means specifically for Section 8 operators looking for landlord partners
  - Any opportunities or risks to watch

Mention specific cities, metro areas, data points, and percentages. Be thorough — this is the CEO's primary market intelligence.

CRITICAL: Only cite specific data points if they come from the provided articles. Do not invent statistics or reference events from years prior to 2026. If articles are thin, use your training knowledge of current trends as of April 2026 to provide real directional analysis.

Format:
SMS_PARAGRAPH: [5-8 sentence dense briefing — MUST come first]

• Bullet point 1
• Bullet point 2
...

[detailed analysis paragraphs]`,
  },
  {
    id: 'section8',
    emoji: '📜',
    title: 'SECTION 8 & HUD',
    queries: [
      'HUD voucher 2026 policy update',
      'section 8 landlord news housing choice voucher',
      'fair market rent update HUD payment standard',
    ],
    timeFilter: 'qdr:w',
    prompt: `You are a policy analyst briefing a Section 8 housing company CEO. Synthesize these articles about HUD, Section 8, and voucher policy into a comprehensive briefing.

IMPORTANT — WRITE THIS FIRST:
SMS_BRIEFING: Write 5-8 sentences (~600 characters) covering the top 3-4 Section 8/HUD developments with specific numbers, policy names, and dates. Include actionable takeaways. No bullet points, no markdown bold — just a dense, informative paragraph. This will be sent via text message.

Then provide:
- 5-8 key bullet points covering FMR changes, voucher utilization rates, PHA processing times, legislative updates, funding changes, and any new regulations
- 3-4 detailed paragraphs explaining:
  - Specific policy changes and their timeline
  - How these changes affect voucher holders and landlord participation
  - What a company connecting Section 8 tenants with landlords should do differently
  - Upcoming deadlines, comment periods, or implementation dates

Be specific with numbers, dates, policy names, and dollar amounts.

CRITICAL: Only cite specific data points if they come from the provided articles. Do not invent statistics or reference events from years prior to 2026. If articles are thin, use your training knowledge of current HUD/Section 8 trends as of April 2026 to provide real directional analysis.

Format:
SMS_PARAGRAPH: [5-8 sentence dense briefing — MUST come first]

• Bullet point 1
• Bullet point 2
...

[detailed analysis paragraphs]`,
  },
  {
    id: 'aitech',
    emoji: '🤖',
    title: 'AI & TECH',
    queries: [
      'AI product launch 2026 new tools',
      'proptech startup funding real estate technology',
      'real estate automation AI CRM SaaS tools',
    ],
    timeFilter: 'qdr:w',
    prompt: `You are a tech analyst briefing a real estate tech CEO. Synthesize these articles about AI, proptech, and technology developments into a comprehensive briefing.

IMPORTANT — WRITE THIS FIRST:
SMS_BRIEFING: Write 5-8 sentences (~600 characters) covering the top 3-4 AI/tech developments, new tools, or product launches with specific names and details. Include actionable takeaways. No bullet points, no markdown bold — just a dense, informative paragraph. This will be sent via text message.

Then provide:
- 5-8 key bullet points about new AI tools, proptech launches, automation trends, and notable company moves
- 3-4 detailed paragraphs covering:
  - New product launches, features, or platform updates relevant to real estate or small business
  - AI tools that could be used to automate operations, marketing, or tenant outreach
  - Funding rounds, acquisitions, and company moves in proptech
  - Specific companies, products, pricing, and how they could enhance a growing housing platform

Be thorough with names, numbers, and implications. Focus on tools and products the CEO could actually try or use.

CRITICAL: Only cite specific data points if they come from the provided articles. Do not invent statistics or reference events from years prior to 2026. If articles are thin, use your training knowledge of current AI/proptech trends as of April 2026 to provide real analysis.

Format:
SMS_PARAGRAPH: [5-8 sentence dense briefing — MUST come first]

• Bullet point 1
• Bullet point 2
...

[detailed analysis paragraphs]`,
  },
  {
    id: 'stocks',
    emoji: '📈',
    title: 'STOCKS & MARKETS',
    queries: [
      'stock market today S&P 500',
      'Federal Reserve interest rate decision mortgage rates',
      'mortgage rate today housing affordability',
    ],
    timeFilter: 'qdr:d',
    prompt: `You are a financial analyst briefing a real estate tech CEO. Synthesize these articles about the stock market and financial markets into a comprehensive briefing.

IMPORTANT — WRITE THIS FIRST:
SMS_BRIEFING: Write 5-8 sentences (~600 characters) covering the top 3-4 market developments — index moves, rate decisions, notable stocks, and macro signals with specific numbers. Include actionable takeaways. No bullet points, no markdown bold — just a dense, informative paragraph. This will be sent via text message.

Then provide:
- 5-8 key bullet points with specific numbers — index levels, percentage changes, Treasury yields, Fed decisions, notable stock movers (especially Tesla, real estate stocks like Redfin/Zillow, REITs, and major tech stocks). Include any notable IPO filings or upcoming IPOs.
- 3-4 detailed paragraphs covering:
  - What moved and why (earnings, economic data, Fed signals, rate decisions)
  - Interest rate trajectory, Fed chair comments, and mortgage rate implications
  - Notable IPOs, SPAC deals, or companies going public that matter
  - Impact on real estate investment, housing affordability, and REIT performance
  - Crypto/Bitcoin if relevant to macro picture

Mention specific numbers, percentages, price levels, and speaker names (Fed chair, CEOs, analysts).

CRITICAL: Only cite specific data points if they come from the provided articles. Do not invent statistics or reference events from years prior to 2026. If articles are thin, use your training knowledge of current market conditions as of April 2026.

Format:
SMS_PARAGRAPH: [5-8 sentence dense briefing — MUST come first]

• Bullet point 1
• Bullet point 2
...

[detailed analysis paragraphs]`,
  },
  {
    id: 'world',
    emoji: '🌍',
    title: 'WORLD & BUSINESS NEWS',
    queries: [
      'economy news today jobs report GDP',
      'trade policy tariffs regulation business 2026',
      'major business news earnings corporate',
    ],
    timeFilter: 'qdr:d',
    prompt: `You are a business intelligence analyst briefing a CEO. Synthesize these articles about major world and business news into a comprehensive briefing.

IMPORTANT — WRITE THIS FIRST:
SMS_BRIEFING: Write 5-8 sentences (~600 characters) covering the top 3-4 world/business developments with specific numbers, names, and implications. Include actionable takeaways. No bullet points, no markdown bold — just a dense, informative paragraph. This will be sent via text message.

Then provide:
- 5-8 key bullet points about the biggest headlines — jobs reports, economic data, trade policy, tariffs, regulation changes, geopolitics that affect business, and notable earnings or corporate news
- 3-4 detailed paragraphs on:
  - Economic indicators and what they signal for the next quarter
  - Policy changes, tariffs, or regulations affecting business operations and real estate
  - International developments with domestic impact
  - What a real estate tech CEO should know and prepare for

Be specific with numbers, names, and dates.

CRITICAL: Only cite specific data points if they come from the provided articles. Do not invent statistics or reference events from years prior to 2026. If articles are thin, use your training knowledge of current world/business trends as of April 2026.

Format:
SMS_PARAGRAPH: [5-8 sentence dense briefing — MUST come first]

• Bullet point 1
• Bullet point 2
...

[detailed analysis paragraphs]`,
  },
];

async function sendDiscordEmbed(username: string, embed: any) {
  try {
    const res = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, embeds: [embed] }),
    });
    if (!res.ok) {
      console.error('Discord post failed:', await res.text());
    }
    // Rate limit courtesy
    await new Promise(r => setTimeout(r, 600));
  } catch (err) {
    console.error('Discord send error:', err);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let briefingType = 'morning';
    try {
      const body = await req.json();
      if (body?.type === 'evening') briefingType = 'evening';
      if (body?.type === 'nightcap') briefingType = 'nightcap';
    } catch { /* no body = morning */ }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // --- Signups ---
    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('id, user_type, created_at')
      .gte('created_at', twentyFourHoursAgo);

    const newTenants = (recentProfiles || []).filter(p => p.user_type === 'tenant').length;
    const newLandlords = (recentProfiles || []).filter(p => p.user_type === 'landlord').length;

    // --- Properties ---
    const { data: recentProperties } = await supabase
      .from('properties')
      .select('id, acquisition_source, created_at')
      .gte('created_at', twentyFourHoursAgo);

    const scoutProperties = (recentProperties || []).filter(p => p.acquisition_source === 'scout_agent').length;
    const manualProperties = (recentProperties || []).length - scoutProperties;

    // --- Applications ---
    const { data: recentApps } = await supabase
      .from('applications')
      .select('id')
      .gte('created_at', twentyFourHoursAgo);
    const newApplications = (recentApps || []).length;

    // --- Matches ---
    const { data: matchLogs } = await supabase
      .from('agent_activity_logs')
      .select('id')
      .eq('agent_id', 'matchmaker')
      .eq('log_type', 'activity')
      .gte('created_at', twentyFourHoursAgo);
    const matchesPushed = (matchLogs || []).length;

    // --- Push pipeline snapshot ---
    const { data: pushStats } = await supabase
      .from('property_pushes')
      .select('status');
    const pushesSent = (pushStats || []).filter(p => p.status === 'push_sent').length;
    const pushesInReview = (pushStats || []).filter(p => p.status === 'landlord_review').length;
    const pushesLeased = (pushStats || []).filter(p => p.status === 'lease_signed').length;
    const pushesDenied = (pushStats || []).filter(p => p.status === 'denied').length;

    // --- Pushes last 24h ---
    const { data: recentPushes } = await supabase
      .from('property_pushes')
      .select('id')
      .gte('created_at', twentyFourHoursAgo);
    const pushesLast24h = (recentPushes || []).length;

    // --- Tenant pipeline ---
    const { data: tenantPipeline } = await supabase
      .from('profiles')
      .select('housing_status')
      .eq('user_type', 'tenant');
    const tenantsSeeking = (tenantPipeline || []).filter(p => p.housing_status === 'seeking').length;
    const tenantsApproved = (tenantPipeline || []).filter(p => p.housing_status === 'approved').length;
    const tenantsHoused = (tenantPipeline || []).filter(p => p.housing_status === 'housed').length;

    // --- New tenant names ---
    const { data: recentTenantNames } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_type', 'tenant')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(5);
    const tenantNamesList = (recentTenantNames || []).map(t => `${t.first_name || ''} ${t.last_name || ''}`.trim()).filter(Boolean);

    // --- New landlord names ---
    const { data: recentLandlordNames } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_type', 'landlord')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(5);
    const landlordNamesList = (recentLandlordNames || []).map(l => `${l.first_name || ''} ${l.last_name || ''}`.trim()).filter(Boolean);

    // --- Platform totals ---
    const [totalTenantsRes, totalLandlordsRes, totalPropertiesRes, activeListingsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'tenant'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'landlord'),
      supabase.from('properties').select('id', { count: 'exact', head: true }),
      supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    const totalTenants = totalTenantsRes.count || 0;
    const totalLandlords = totalLandlordsRes.count || 0;
    const totalProperties = totalPropertiesRes.count || 0;
    const activeListings = activeListingsRes.count || 0;

    const { count: totalPlacements } = await supabase
      .from('leases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    // --- Scout leads status ---
    const { data: scoutLeads } = await supabase
      .from('scout_leads')
      .select('id, status');

    const leadsPending = (scoutLeads || []).filter(p => p.status === 'pending').length;
    const leadsApproved = (scoutLeads || []).filter(p => p.status === 'approved').length;
    const leadsDismissed = (scoutLeads || []).filter(p => p.status === 'dismissed').length;

    // ============================================================
    // MARKET INTEL
    // ============================================================
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    type MarketSection = {
      id: string;
      emoji: string;
      title: string;
      bullets: string;
      analysis: string;
      sources: string;
      smsParagraph: string;
    };

    const marketSections: MarketSection[] = [];

    if (firecrawlKey) {
      const scrapeResults = await Promise.all(
        MARKET_CATEGORIES.map(async (cat) => {
          try {
            // Run all sub-queries in parallel
            const subResults = await Promise.all(
              cat.queries.map(async (query) => {
                try {
                  const res = await fetch('https://api.firecrawl.dev/v1/search', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${firecrawlKey}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      query,
                      limit: 4,
                      tbs: cat.timeFilter,
                      scrapeOptions: { formats: ['markdown'] },
                    }),
                  });

                  if (!res.ok) {
                    console.error(`Firecrawl search failed for ${cat.id} query "${query}": ${res.status}`);
                    return [];
                  }

                  const result = await res.json();
                  return result.data || result.results || [];
                } catch (err) {
                  console.error(`Firecrawl error for ${cat.id} query "${query}":`, err);
                  return [];
                }
              })
            );

            // Merge, deduplicate by URL, filter junk sources
            const seenUrls = new Set<string>();
            const allArticles: any[] = [];
            for (const items of subResults) {
              for (const item of items) {
                const url = item.url || item.metadata?.sourceURL || '';
                const markdown = item.markdown || item.data?.markdown || '';

                // Skip duplicates
                if (seenUrls.has(url)) continue;
                seenUrls.add(url);

                // Skip junk domains
                try {
                  const hostname = new URL(url).hostname.toLowerCase();
                  if (JUNK_DOMAINS.some(d => hostname.includes(d))) continue;
                } catch { /* skip invalid URLs */ continue; }

                // Skip thin content
                if (markdown.length < MIN_CONTENT_LENGTH) continue;

                allArticles.push({
                  title: item.title || item.metadata?.title || 'Untitled',
                  url,
                  markdown,
                });
              }
            }

            console.log(`[${cat.id}] Found ${allArticles.length} quality articles from ${cat.queries.length} sub-queries`);

            return {
              cat,
              articles: allArticles.slice(0, 8),
            };
          } catch (err) {
            console.error(`Firecrawl error for ${cat.id}:`, err);
            return { cat, articles: [] };
          }
        })
      );

      if (lovableApiKey) {
        const synthesisResults = await Promise.all(
          scrapeResults.map(async ({ cat, articles }) => {
            // Fallback: if no articles, still generate from AI knowledge
            const hasArticles = articles.length > 0;

            const sourceLinks = hasArticles ? articles
              .map((a: any, i: number) => {
                const domain = (() => { try { return new URL(a.url).hostname.replace('www.', ''); } catch { return 'source'; } })();
                return `[[${i + 1}] ${domain}](${a.url})`;
              })
              .join(' | ') : '';

            const articleContent = hasArticles
              ? articles
                .map((a: any, i: number) => `--- Article ${i + 1}: ${a.title} ---\n${(a.markdown || '').slice(0, 4000)}`)
                .join('\n\n')
              : '';

            const userMessage = hasArticles
              ? `Here are today's articles:\n\n${articleContent}`
              : `No articles were found from recent searches for this category. Using your training knowledge of current ${cat.title.toLowerCase()} trends as of ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}, write a comprehensive briefing with the most important recent developments, trend directions, and actionable insights. Do NOT invent specific statistics or cite specific events from before 2026. Focus on directional trends, policy trajectories, and what a CEO should know right now. Still include the SMS_PARAGRAPH first, bullet points, and analysis paragraphs.`;

            try {
              const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${lovableApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-3-flash-preview',
                  max_tokens: 4096,
                  messages: [
                    { role: 'system', content: cat.prompt },
                    { role: 'user', content: userMessage },
                  ],
                }),
              });

              if (!aiRes.ok) {
                console.error(`AI Gateway failed for ${cat.id}: ${aiRes.status}`);
                const linkList = hasArticles ? articles.map((a: any) => `• [${a.title}](${a.url})`).join('\n') : '• No updates today';
                return { id: cat.id, emoji: cat.emoji, title: cat.title, bullets: linkList, analysis: '', sources: '', smsParagraph: 'Check back tomorrow for updates.' };
              }

              const aiData = await aiRes.json();
              const fullText = aiData.choices?.[0]?.message?.content || '';

              // Extract SMS paragraph (now at the TOP of the response)
              let smsParagraph = '';
              let textForParsing = fullText;
              const smsMatch = fullText.match(/SMS_PARAGRAPH:\s*\*{0,2}(.+?)\*{0,2}(?:\n\n|\n(?=•|\-))/s);
              if (smsMatch) {
                smsParagraph = smsMatch[1].trim().replace(/\*+/g, '').slice(0, 800);
                textForParsing = fullText.slice((smsMatch.index || 0) + smsMatch[0].length).trim();
              } else {
                // Fallback: try end-of-text pattern
                const endMatch = fullText.match(/SMS_PARAGRAPH:\s*\*{0,2}(.+?)\*{0,2}\s*$/s);
                if (endMatch) {
                  smsParagraph = endMatch[1].trim().replace(/\*+/g, '').slice(0, 800);
                  textForParsing = fullText.slice(0, endMatch.index).trim();
                }
              }

              const lines = textForParsing.split('\n');
              const bulletLines: string[] = [];
              const analysisLines: string[] = [];
              let pastBullets = false;

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
                  if (!pastBullets) {
                    bulletLines.push(trimmed.startsWith('•') ? trimmed : `• ${trimmed.slice(1).trim()}`);
                    continue;
                  }
                }
                if (bulletLines.length > 0 && trimmed === '') {
                  pastBullets = true;
                  continue;
                }
                if (bulletLines.length > 0) pastBullets = true;
                if (pastBullets && trimmed) analysisLines.push(trimmed);
              }

              return {
                id: cat.id,
                emoji: cat.emoji,
                title: cat.title,
                bullets: bulletLines.join('\n') || '• No major updates today',
                analysis: analysisLines.join('\n\n') || '',
                sources: sourceLinks ? `Sources: ${sourceLinks}` : '',
                smsParagraph: smsParagraph || analysisLines.slice(0, 1).join(' ').slice(0, 280) || 'No updates today.',
              };
            } catch (aiErr) {
              console.error(`AI synthesis error for ${cat.id}:`, aiErr);
              const linkList = articles.map((a: any) => `• [${a.title}](${a.url})`).join('\n');
              return { id: cat.id, emoji: cat.emoji, title: cat.title, bullets: linkList, analysis: '', sources: '', smsParagraph: 'No updates today.' };
            }
          })
        );

        marketSections.push(...synthesisResults);
      } else {
        for (const { cat, articles } of scrapeResults) {
          const linkList = articles.length > 0
            ? articles.map((a: any) => `• [${a.title}](${a.url})`).join('\n')
            : '• No updates today';
          marketSections.push({ id: cat.id, emoji: cat.emoji, title: cat.title, bullets: linkList, analysis: '', sources: '', smsParagraph: 'No updates today.' });
        }
      }
    }

    // === EVENING DIGEST ===
    if (briefingType === 'evening') {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayContent } = await supabase
        .from('content')
        .select('title, content_type, template, slug')
        .gte('publish_date', todayStart.toISOString())
        .eq('status', 'published')
        .order('publish_date');

      const { data: todayBlogs } = await supabase
        .from('blog_posts')
        .select('title, pillar_id')
        .gte('published_at', todayStart.toISOString())
        .eq('status', 'published')
        .order('published_at');

      const { data: todayLocations } = await supabase
        .from('seo_location_queue')
        .select('city, state, page_type, status')
        .gte('updated_at', todayStart.toISOString())
        .in('status', ['published', 'failed']);

      const { data: agentLogs } = await supabase
        .from('agent_activity_logs')
        .select('action, detail')
        .eq('agent_id', 'content-seo')
        .gte('created_at', todayStart.toISOString());

      const publishedList = [
        ...(todayContent || []).map(c => `📄 ${c.title} (${c.template || c.content_type})`),
        ...(todayBlogs || []).map(b => `📝 ${b.title}`),
      ];

      const locationPublished = (todayLocations || []).filter(l => l.status === 'published').length;
      const locationFailed = (todayLocations || []).filter(l => l.status === 'failed').length;

      const { count: pendingCount } = await supabase
        .from('seo_location_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Save full report to DB
      const eveningReport = {
        metrics: {
          contentPublished: publishedList.length,
          locationPages: locationPublished,
          locationFailed,
          queueRemaining: pendingCount || 0,
          blogPosts: (todayBlogs || []).length,
        },
        publishedItems: publishedList,
        agentActivity: (agentLogs || []).slice(0, 10),
      };

      await supabase.from('agent_reports').insert({
        agent_id: 'briefing',
        report_type: 'evening_digest',
        title: `Evening Digest — ${dateStr}`,
        content: eveningReport,
        summary: `Content: ${publishedList.length} published | Locations: ${locationPublished} pages | Queue: ${pendingCount || 0} pending`,
      });

      // Send Discord
      const eveningFields: any[] = [
        {
          name: '📊 TODAY\'S CONTENT ACTIVITY',
          value: [
            `• Total Published: **${publishedList.length}**`,
            `• Location Pages: **${locationPublished}** published, **${locationFailed}** failed`,
            `• Blog Posts: **${(todayBlogs || []).length}**`,
            `• Queue Remaining: **${pendingCount || 0}** pending locations`,
          ].join('\n'),
          inline: false,
        },
      ];

      if (publishedList.length > 0) {
        eveningFields.push({
          name: '✅ PUBLISHED TODAY',
          value: publishedList.slice(0, 10).join('\n').slice(0, 1024) || 'None',
          inline: false,
        });
      }

      if ((agentLogs || []).length > 0) {
        eveningFields.push({
          name: '🤖 AGENT ACTIVITY',
          value: (agentLogs || []).slice(0, 5).map(l => `• ${l.action}: ${l.detail}`).join('\n').slice(0, 1024),
          inline: false,
        });
      }

      await sendDiscordEmbed('Billy — Evening Digest', {
        title: `🌙 EVENING DIGEST — ${dateStr}`,
        color: 0x8B5CF6,
        fields: eveningFields.slice(0, 25),
        footer: { text: '🕘 Next morning brief: Tomorrow 9:00 AM EST' },
        timestamp: now.toISOString(),
      });

      await supabase.from('agent_activity_logs').insert({
        agent_id: 'briefing',
        action: 'Evening Digest Posted',
        detail: `Content: ${publishedList.length} pieces | Locations: ${locationPublished} published | Queue: ${pendingCount || 0} pending`,
        log_type: 'activity',
      });

      return new Response(JSON.stringify({
        success: true, type: 'evening',
        published: publishedList.length,
        locationPages: locationPublished,
        queueRemaining: pendingCount || 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === NIGHTCAP RECAP (9:30 PM ET) ===
    if (briefingType === 'nightcap') {
      const smsLines = [
        `🌙 NIGHTLY RECAP — ${dateStr}`,
        ``,
        `📥 SIGNUPS (24h): ${newTenants} tenants, ${newLandlords} landlords`,
      ];

      if (tenantNamesList.length > 0) {
        smsLines.push(`  Tenants: ${tenantNamesList.join(', ')}`);
      }
      if (landlordNamesList.length > 0) {
        smsLines.push(`  Landlords: ${landlordNamesList.join(', ')}`);
      }

      smsLines.push(
        ``,
        `🏠 PROPERTIES (24h): ${(recentProperties || []).length} added (${scoutProperties} scout, ${manualProperties} manual)`,
        `📋 APPLICATIONS (24h): ${newApplications}`,
        ``,
        `🔔 PUSHES (24h): ${pushesLast24h} sent`,
        `📊 PIPELINE: ${pushesSent} pending → ${pushesInReview} in review → ${pushesLeased} leased | ${pushesDenied} denied`,
        ``,
        `📈 PLATFORM TOTALS`,
        `  ${totalTenants} tenants (${tenantsSeeking} seeking, ${tenantsApproved} approved, ${tenantsHoused} housed)`,
        `  ${totalLandlords} landlords | ${totalProperties} properties (${activeListings} active)`,
        `  ${totalPlacements || 0} active leases`,
        `  Scout leads: ${leadsPending} pending, ${leadsApproved} approved, ${leadsDismissed} dismissed`,
      );

      const smsBody = smsLines.join('\n');

      // Send SMS
      await notifyOwner({ subject: 'NIGHTLY RECAP', body: smsBody });

      // Send Discord
      await sendDiscordEmbed('Billy — Nightly Recap', {
        title: `🌙 NIGHTLY RECAP — ${dateStr}`,
        color: 0x6366F1,
        fields: [
          {
            name: '📥 Signups (24h)',
            value: `**${newTenants}** tenants, **${newLandlords}** landlords${tenantNamesList.length ? `\n${tenantNamesList.join(', ')}` : ''}${landlordNamesList.length ? `\n${landlordNamesList.join(', ')}` : ''}`,
            inline: true,
          },
          {
            name: '🏠 Properties (24h)',
            value: `**${(recentProperties || []).length}** added\n${scoutProperties} scout, ${manualProperties} manual`,
            inline: true,
          },
          {
            name: '📋 Applications',
            value: `**${newApplications}** (24h)`,
            inline: true,
          },
          {
            name: '🔔 Pushes (24h)',
            value: `**${pushesLast24h}** sent`,
            inline: true,
          },
          {
            name: '📊 Push Pipeline',
            value: `${pushesSent} pending | ${pushesInReview} review | ${pushesLeased} leased | ${pushesDenied} denied`,
            inline: false,
          },
          {
            name: '📈 Platform Totals',
            value: [
              `${totalTenants} tenants (${tenantsSeeking} seeking, ${tenantsApproved} approved, ${tenantsHoused} housed)`,
              `${totalLandlords} landlords | ${totalProperties} properties (${activeListings} active)`,
              `${totalPlacements || 0} active leases`,
              `Scout: ${leadsPending} pending, ${leadsApproved} approved, ${leadsDismissed} dismissed`,
            ].join('\n'),
            inline: false,
          },
        ],
        footer: { text: '🌅 Next morning brief: Tomorrow 10:00 AM ET' },
        timestamp: now.toISOString(),
      });

      // Save report
      await supabase.from('agent_reports').insert({
        agent_id: 'briefing',
        report_type: 'nightly_recap',
        title: `Nightly Recap — ${dateStr}`,
        content: {
          signups: { tenants: newTenants, landlords: newLandlords, tenantNames: tenantNamesList, landlordNames: landlordNamesList },
          properties: { total: (recentProperties || []).length, scout: scoutProperties, manual: manualProperties },
          applications: newApplications,
          pushes: { last24h: pushesLast24h, sent: pushesSent, inReview: pushesInReview, leased: pushesLeased, denied: pushesDenied },
          totals: { tenants: totalTenants, landlords: totalLandlords, properties: totalProperties, activeListings, placements: totalPlacements || 0 },
          scoutLeads: { pending: leadsPending, approved: leadsApproved, dismissed: leadsDismissed },
        },
        summary: `Signups: ${newTenants}T/${newLandlords}L | Props: ${(recentProperties || []).length} | Apps: ${newApplications} | Pushes: ${pushesLast24h}`,
      });

      await supabase.from('agent_activity_logs').insert({
        agent_id: 'briefing',
        action: 'Nightly Recap Sent',
        detail: `Signups: ${newTenants}T/${newLandlords}L | Props: ${(recentProperties || []).length} | Pushes: ${pushesLast24h}`,
        log_type: 'activity',
      });

      console.log('[agent-briefing] Nightly recap sent successfully');

      return new Response(JSON.stringify({
        success: true, type: 'nightcap',
        signups: { tenants: newTenants, landlords: newLandlords },
        properties: (recentProperties || []).length,
        applications: newApplications,
        pushes: pushesLast24h,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // === MORNING BRIEFING ===

    // --- Message 1: Site Performance ---
    await sendDiscordEmbed('Billy — Daily Brief', {
      title: `📋 CEO DAILY BRIEF — ${dateStr}`,
      color: 0x3B82F6,
      fields: [
        {
          name: '📊 SINCE LAST BRIEF',
          value: [
            `• New Signups: **${newTenants}** tenants, **${newLandlords}** landlords`,
            `• Properties Added: **${(recentProperties || []).length}** (${scoutProperties} scout, ${manualProperties} manual)`,
            `• Applications: **${newApplications}** submitted`,
            `• Matches Pushed: **${matchesPushed}**`,
          ].join('\n'),
          inline: false,
        },
        {
          name: '📈 PLATFORM TOTALS',
          value: [
            `• Tenants: **${totalTenants}** | Landlords: **${totalLandlords}**`,
            `• Properties: **${totalProperties}** | Active: **${activeListings}**`,
            `• Placements: **${totalPlacements || 0}** all-time`,
          ].join('\n'),
          inline: false,
        },
        {
          name: '📞 SCOUT LEADS',
          value: `• Pending Review: **${leadsPending}** | Approved: **${leadsApproved}** | Dismissed: **${leadsDismissed}**`,
          inline: false,
        },
      ],
      footer: { text: '🔽 Market intel follows in separate messages below' },
      timestamp: now.toISOString(),
    });

    // --- Messages 2-6: One per research category ---
    for (const section of marketSections) {
      const fields: any[] = [];

      // Bullets
      fields.push({
        name: 'Key Points',
        value: section.bullets.slice(0, 1024),
        inline: false,
      });

      // Analysis — split into chunks if long
      if (section.analysis) {
        const analysisChunks = section.analysis.match(/.{1,1024}/gs) || [];
        for (let i = 0; i < Math.min(analysisChunks.length, 3); i++) {
          fields.push({
            name: i === 0 ? 'Analysis' : '\u200B',
            value: analysisChunks[i],
            inline: false,
          });
        }
      }

      if (section.sources) {
        fields.push({
          name: '\u200B',
          value: section.sources.slice(0, 1024),
          inline: false,
        });
      }

      await sendDiscordEmbed('Billy — Market Intel', {
        title: `${section.emoji} ${section.title}`,
        color: 0x10B981,
        fields,
        timestamp: now.toISOString(),
      });
    }

    // --- Save full report to DB ---
    const reportContent = {
      metrics: {
        newTenants,
        newLandlords,
        propertiesAdded: (recentProperties || []).length,
        scoutProperties,
        manualProperties,
        applications: newApplications,
        matchesPushed,
        totalTenants,
        totalLandlords,
        totalProperties,
        activeListings,
        placements: totalPlacements || 0,
        leadsPending,
        leadsApproved,
        leadsDismissed,
      },
      categories: marketSections.map(s => ({
        id: s.id,
        title: s.title,
        bullets: s.bullets,
        analysis: s.analysis,
        sources: s.sources,
      })),
    };

    await supabase.from('agent_reports').insert({
      agent_id: 'briefing',
      report_type: 'morning_brief',
      title: `CEO Daily Brief — ${dateStr}`,
      content: reportContent,
      summary: `Signups: ${newTenants}T/${newLandlords}L | Props: ${(recentProperties || []).length} | Apps: ${newApplications} | ${marketSections.length} research categories`,
    });

    // Log activity
    await supabase.from('agent_activity_logs').insert({
      agent_id: 'briefing',
      action: 'Daily Brief Posted',
      detail: `Signups: ${newTenants}T/${newLandlords}L | Props: ${(recentProperties || []).length} | Apps: ${newApplications} | Market sections: ${marketSections.length} | Report saved to DB`,
      log_type: 'activity',
    });

    // Store in memory
    await supabase.from('agent_memory').upsert({
      agent_id: 'briefing',
      key: 'last_daily_brief',
      value: JSON.stringify({
        date: dateStr,
        signups: { tenants: newTenants, landlords: newLandlords },
        properties: { total: (recentProperties || []).length, scout: scoutProperties, manual: manualProperties },
        applications: newApplications,
        matchesPushed,
        totals: { tenants: totalTenants, landlords: totalLandlords, properties: totalProperties, activeListings, placements: totalPlacements || 0 },
        marketSections: marketSections.length,
      }),
      ttl_hours: 48,
      expires_at: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'agent_id,key' });

    // Send SMS summary to owner
    const smsLines: string[] = [];
    try {
      smsLines.push(
        `📊 LAST 24H`,
        `• Signups: ${newTenants} tenants, ${newLandlords} landlords`,
      );
      if (tenantNamesList.length > 0) smsLines.push(`  → ${tenantNamesList.join(', ')}`);
      if (landlordNamesList.length > 0) smsLines.push(`  → Landlords: ${landlordNamesList.join(', ')}`);
      smsLines.push(
        `• Properties: ${(recentProperties || []).length} new (${scoutProperties} scout, ${manualProperties} manual)`,
        `• Applications: ${newApplications}`,
        `• Pushes (24h): ${pushesLast24h}`,
        ``,
        `🏗️ PIPELINE`,
        `• Tenants: ${tenantsSeeking} seeking → ${tenantsApproved} approved → ${tenantsHoused} housed`,
        `• Properties: ${activeListings} active | ${totalProperties - activeListings} other`,
        `• Pushes: ${pushesSent} sent | ${pushesInReview} in review | ${pushesLeased} leased | ${pushesDenied} denied`,
        `• Scout leads: ${leadsPending} pending`,
        ``,
        `📈 TOTALS`,
        `• ${totalTenants} tenants | ${totalLandlords} landlords`,
        `• ${activeListings} properties on market`,
        `• ${totalPlacements || 0} placements all-time`,
      );
      // Don't send individually — collect for batch below
    } catch (e) { console.error('[Briefing] Owner SMS build failed:', e); }

    // === THE DAILY DOSE — 3-part CEO intelligence digest ===
    // Collect all messages into a batch, then send staggered per recipient
    try {
      const shortDate = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const getSection = (id: string) => marketSections.find(s => s.id === id);
      const housing = getSection('housing');
      const section8 = getSection('section8');
      const stocks = getSection('stocks');
      const aitech = getSection('aitech');
      const world = getSection('world');

      // Part 1: Real Estate
      const dose1 = [
        `☕ THE DAILY DOSE — ${shortDate}`,
        ``,
        `🏠 HOUSING`,
        housing?.smsParagraph || 'No updates today.',
        ``,
        housing?.bullets ? `📌 Key Points:\n${housing.bullets}` : '',
        ``,
        `📜 SECTION 8`,
        section8?.smsParagraph || 'No updates today.',
        ``,
        section8?.bullets ? `📌 Key Points:\n${section8.bullets}` : '',
      ].filter(Boolean).join('\n');

      // Part 2: Money & Tech
      const dose2 = [
        `☕ DAILY DOSE — Money & Tech`,
        ``,
        `📈 MARKETS & MONEY`,
        stocks?.smsParagraph || 'No updates today.',
        ``,
        stocks?.bullets ? `📌 Key Points:\n${stocks.bullets}` : '',
        ``,
        `🤖 AI & TECH`,
        aitech?.smsParagraph || 'No updates today.',
        ``,
        aitech?.bullets ? `📌 Key Points:\n${aitech.bullets}` : '',
      ].filter(Boolean).join('\n');

      // Part 3: World
      const dose3 = [
        `☕ DAILY DOSE — World`,
        ``,
        `🌍 WORLD & BUSINESS`,
        world?.smsParagraph || 'No updates today.',
        ``,
        world?.bullets ? `📌 Key Points:\n${world.bullets}` : '',
      ].filter(Boolean).join('\n');

      // Build full batch: Daily Brief + 3 Doses
      const fullBatch = [
        { subject: `Daily Brief — ${dateStr}`, body: smsLines.join('\n') },
        { subject: `Daily Dose 1/3`, body: dose1 },
        { subject: `Daily Dose 2/3`, body: dose2 },
        { subject: `Daily Dose 3/3`, body: dose3 },
      ];

      // Send all 4 messages staggered per recipient (3s between msgs, 30s between recipients)
      await notifyOwnerBatch(fullBatch);
    } catch (e) { console.error('[Briefing] Daily Dose SMS failed:', e); }

    return new Response(JSON.stringify({
      success: true,
      signups: { tenants: newTenants, landlords: newLandlords },
      propertiesAdded: (recentProperties || []).length,
      applications: newApplications,
      matchesPushed,
      marketSections: marketSections.length,
      reportSaved: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Briefing error:', error);
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
