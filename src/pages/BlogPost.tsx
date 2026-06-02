import React, { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { trackLinkClick } from '@/hooks/useLinkClickAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Calendar, User, Tag, Eye } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useBlogPost, useRelatedPosts } from '@/hooks/useBlogPosts';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';

const BlogPost = () => {
  const { slug } = useParams();
  const { data: post, isLoading, error } = useBlogPost(slug);
  const { data: relatedPosts } = useRelatedPosts(post?.pillar_id, slug);
  const contentRef = useRef<HTMLDivElement>(null);

  // Track view count for published posts
  useEffect(() => {
    if (!post?.id) return;
    supabase.rpc('increment_blog_view_count', { post_id: post.id });
  }, [post?.id]);

  // Track link clicks in blog content
  useEffect(() => {
    if (!post?.id || !contentRef.current) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor && anchor.href) {
        // Fire and forget - don't block navigation
        trackLinkClick(post.id, anchor.href, anchor.textContent);
      }
    };

    const contentDiv = contentRef.current;
    contentDiv.addEventListener('click', handleClick);
    
    return () => {
      contentDiv.removeEventListener('click', handleClick);
    };
  }, [post?.id]);

  // Legacy hardcoded posts for backward compatibility
  const legacyPosts: Record<string, any> = {
    'section-8-housing-guide': {
      title: 'Understanding Section 8 Housing: A Complete Guide for Tenants',
      category: 'Tenant Guide',
      categoryColor: 'bg-openkey-blue/10 text-openkey-blue',
      date: 'March 15, 2024',
      author: 'OpenKey Team',
      readTime: '8 min read',
      content: `
        <p class="text-lg text-muted-foreground mb-6">Navigating the Section 8 housing process can feel overwhelming, but with the right information, you can find quality affordable housing that meets your needs.</p>
        <h2 class="text-2xl font-bold text-foreground mb-4">What is Section 8 Housing?</h2>
        <p class="text-muted-foreground mb-6">The Section 8 Housing Choice Voucher Program is a federal assistance program that helps low-income families, elderly, and disabled individuals afford decent, safe, and sanitary housing in the private market.</p>
      `
    },
    'property-investment-tips': {
      title: 'Property Investment Tips: Working with Section 8 Tenants',
      category: 'Investment',
      categoryColor: 'bg-openkey-green/10 text-openkey-green',
      date: 'March 10, 2024',
      author: 'Sarah Johnson',
      readTime: '6 min read',
      content: `
        <p class="text-lg text-muted-foreground mb-6">Accepting Section 8 vouchers can be a smart investment strategy for property owners, offering stable rental income and access to a large tenant pool.</p>
      `
    },
    'building-strong-communities': {
      title: 'Building Strong Communities Through Affordable Housing',
      category: 'Community',
      categoryColor: 'bg-muted text-muted-foreground',
      date: 'March 5, 2024',
      author: 'Michael Chen',
      readTime: '5 min read',
      content: `
        <p class="text-lg text-muted-foreground mb-6">Affordable housing initiatives play a crucial role in creating vibrant, diverse communities that benefit everyone.</p>
      `
    }
  };

  const legacyPost = slug ? legacyPosts[slug] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="bg-card rounded-lg shadow-sm p-8">
            <Skeleton className="h-6 w-24 mb-4" />
            <Skeleton className="h-12 w-full mb-6" />
            <Skeleton className="h-4 w-64 mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Use database post if found, otherwise fall back to legacy
  const displayPost = post || legacyPost;

  if (!displayPost) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">Post Not Found</h1>
            <p className="text-muted-foreground mb-8">The blog post you're looking for doesn't exist.</p>
            <Link to="/blog">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Determine if this is a database post or legacy post
  const isDatabasePost = !!post;

  // Parse content with H1/H2/H3 markers into structured elements
  const parseMarkedContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(' ').trim();
        if (text) {
          elements.push(
            <p key={`p-${elements.length}`} className="text-muted-foreground mb-4">
              {text}
            </p>
          );
        }
        currentParagraph = [];
      }
    };

    // Regex patterns for markers (handles both straight and curly quotes)
    const h1Pattern = /^[""]?H1[""]?\s+(.+)$/i;
    const h2Pattern = /^[""]?H2[""]?\s+(.+)$/i;
    const h3Pattern = /^[""]?H3[""]?\s+(.+)$/i;
    const bodyMarkerPattern = /^[""]?H[123]_BODY[""]?$/i;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines but flush paragraph
      if (!trimmedLine) {
        flushParagraph();
        continue;
      }

      // Skip body markers entirely
      if (bodyMarkerPattern.test(trimmedLine)) {
        continue;
      }

      // Check for H1
      const h1Match = trimmedLine.match(h1Pattern);
      if (h1Match) {
        flushParagraph();
        elements.push(
          <h1 key={`h1-${elements.length}`} className="text-3xl font-bold text-foreground mb-4 mt-8 first:mt-0">
            {h1Match[1].trim()}
          </h1>
        );
        continue;
      }

      // Check for H2
      const h2Match = trimmedLine.match(h2Pattern);
      if (h2Match) {
        flushParagraph();
        elements.push(
          <h2 key={`h2-${elements.length}`} className="text-2xl font-bold text-foreground mb-4 mt-8">
            {h2Match[1].trim()}
          </h2>
        );
        continue;
      }

      // Check for H3
      const h3Match = trimmedLine.match(h3Pattern);
      if (h3Match) {
        flushParagraph();
        elements.push(
          <h3 key={`h3-${elements.length}`} className="text-xl font-semibold text-foreground mb-3 mt-6">
            {h3Match[1].trim()}
          </h3>
        );
        continue;
      }

      // Regular text - accumulate into paragraph
      currentParagraph.push(trimmedLine);
    }

    // Flush any remaining paragraph
    flushParagraph();

    return elements;
  };

  // Check if content has H1/H2/H3 markers
  const hasContentMarkers = (content: string): boolean => {
    return /[""]?H[123][""]?\s+/i.test(content);
  };

  const renderContent = () => {
    if (isDatabasePost && post.content_structure) {
      // Fallback: if sections are empty but we have markdown content, render that
      if ((!post.content_structure.sections || post.content_structure.sections.length === 0) && post.content) {
        console.log('BlogPost: Falling back to markdown content field');
        
        // Check if content has markers - parse them
        if (hasContentMarkers(post.content)) {
          return (
            <div className="prose max-w-none">
              {parseMarkedContent(post.content)}
            </div>
          );
        }
        
        return (
          <div className="prose max-w-none">
            <div 
              className="text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
            />
          </div>
        );
      }

      return (
        <div className="prose max-w-none">
          {/* Render structured sections */}
          {post.content_structure.sections?.map((section, i) => {
            // Handle intro sections without a heading
            if (section.type === 'intro') {
              return (
                <div key={i} className="mb-8 text-lg text-muted-foreground leading-relaxed">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(section.content || section.body || '') 
                    }} 
                  />
                </div>
              );
            }

            // Handle H2 and H3 sections with proper heading levels
            const HeadingTag = section.type === 'h3' ? 'h3' : 'h2';
            const headingClass = section.type === 'h3' 
              ? 'text-xl font-semibold text-foreground mb-3'
              : 'text-2xl font-bold text-foreground mb-4';

            return (
              <div key={i} className="mb-8">
                <HeadingTag className={headingClass}>
                  {section.title || section.heading}
                </HeadingTag>
                <div 
                  className="text-muted-foreground prose prose-gray"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(section.content || section.body || '') 
                  }}
                />
              </div>
            );
          })}

          {/* Render FAQs */}
          {post.content_structure.faqs && post.content_structure.faqs.length > 0 && (
            <div className="mt-12 mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
              <Accordion type="single" collapsible className="w-full">
                {post.content_structure.faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left font-medium">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {/* Render conclusion */}
          {post.content_structure.conclusion && (
            <div className="mt-8 p-6 bg-muted rounded-lg">
              <h2 className="text-xl font-bold text-foreground mb-3">Conclusion</h2>
              <p className="text-muted-foreground">{post.content_structure.conclusion}</p>
            </div>
          )}
        </div>
      );
    }

    // Fallback to plain content or legacy HTML
    const content = isDatabasePost ? post.content : legacyPost?.content;
    if (content) {
      // Check if content has markers - parse them
      if (hasContentMarkers(content)) {
        return (
          <div className="prose max-w-none">
            {parseMarkedContent(content)}
          </div>
        );
      }
      
      return (
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      );
    }

    return null;
  };

  const postTitle = isDatabasePost ? post.title : legacyPost.title;
  const postCategory = isDatabasePost 
    ? (post.blog_pillars?.name || post.blog_categories?.name || 'Blog')
    : legacyPost.category;
  const postDate = isDatabasePost 
    ? format(new Date(post.published_at || post.created_at), 'MMMM d, yyyy')
    : legacyPost.date;
  const postAuthor = isDatabasePost ? 'OpenKey Team' : legacyPost.author;
  const postExcerpt = isDatabasePost ? post.excerpt : null;
  const postViewCount = isDatabasePost ? post.view_count : null;

  return (
    <div className="min-h-screen bg-background">
      {isDatabasePost && (
        <Helmet>
          <title>{post.seo_title || post.title} | OpenKey Housing Hub</title>
          <meta name="description" content={post.seo_description || post.excerpt || ''} />
          {post.seo_keywords && post.seo_keywords.length > 0 && (
            <meta name="keywords" content={post.seo_keywords.join(', ')} />
          )}
          <link rel="canonical" href={`${window.location.origin}/blog/${post.slug}`} />
          <meta property="og:title" content={post.seo_title || post.title} />
          <meta property="og:description" content={post.seo_description || post.excerpt || ''} />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={`${window.location.origin}/blog/${post.slug}`} />
          {post.featured_image_url && (
            <>
              <meta property="og:image" content={post.featured_image_url} />
              {post.featured_image_alt && (
                <meta property="og:image:alt" content={post.featured_image_alt} />
              )}
            </>
          )}
          {post.meta_tags?.json_ld && (
            <script type="application/ld+json">
              {JSON.stringify(post.meta_tags.json_ld)}
            </script>
          )}
        </Helmet>
      )}

      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <Link to="/blog">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>

        {/* Article Header */}
        <article className="bg-card rounded-lg shadow-sm overflow-hidden">
          {/* Featured Image */}
          {isDatabasePost && post.featured_image_url && (
            <img 
              src={post.featured_image_url} 
              alt={post.featured_image_alt || postTitle}
              className="w-full h-64 object-cover"
            />
          )}

          <div className="p-8">
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm inline-block mb-4">
              <Tag className="h-3 w-3 inline mr-1" />
              {postCategory}
            </div>
            
            <h1 className="text-4xl font-bold text-foreground mb-6">{postTitle}</h1>

            {postExcerpt && (
              <p className="text-lg text-muted-foreground mb-6 italic">{postExcerpt}</p>
            )}
            
            <div className="flex items-center flex-wrap gap-4 text-muted-foreground text-sm mb-8">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                {postAuthor}
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {postDate}
              </div>
              {postViewCount !== null && postViewCount > 0 && (
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  {postViewCount} views
                </div>
              )}
            </div>

            {/* Article Content - with ref for link tracking */}
            <div ref={contentRef}>
              {renderContent()}
            </div>
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts && relatedPosts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-foreground mb-8">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedPosts.slice(0, 2).map((relatedPost) => (
                <Card key={relatedPost.id} className="hover:shadow-lg transition-shadow duration-300 cursor-pointer">
                  <Link to={`/blog/${relatedPost.slug}`}>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {relatedPost.title}
                      </h3>
                      {relatedPost.excerpt && (
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                          {relatedPost.excerpt}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{format(new Date(relatedPost.created_at), 'MMM d, yyyy')}</span>
                        <span className="text-primary hover:text-primary/80">
                          Read more →
                        </span>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Fallback related posts for legacy content */}
        {!relatedPosts && legacyPost && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-foreground mb-8">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(legacyPosts)
                .filter(([key]) => key !== slug)
                .slice(0, 2)
                .map(([key, relatedPost]) => (
                  <Card key={key} className="hover:shadow-lg transition-shadow duration-300 cursor-pointer">
                    <Link to={`/blog/${key}`}>
                      <CardContent className="p-6">
                        <div className={`${relatedPost.categoryColor} px-3 py-1 rounded-full text-sm inline-block mb-3`}>
                          {relatedPost.category}
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {relatedPost.title}
                        </h3>
                        <span className="text-sm text-muted-foreground">{relatedPost.date}</span>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
