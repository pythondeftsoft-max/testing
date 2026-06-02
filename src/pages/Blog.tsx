import React, { useState, useMemo } from 'react';
import { Search, Filter, TrendingUp, Users, Home, FileText, Award, CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { format } from 'date-fns';

const Blog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const { data: allPosts, isLoading } = useBlogPosts();

  // Filter to published posts only, then apply search
  const publishedPosts = useMemo(() => {
    const posts = (allPosts || []).filter(p => p.status === 'published');
    if (!searchTerm.trim()) return posts;
    const term = searchTerm.toLowerCase();
    return posts.filter(p =>
      p.title.toLowerCase().includes(term) ||
      (p.excerpt || '').toLowerCase().includes(term) ||
      (p.seo_keywords || []).some(k => k.toLowerCase().includes(term))
    );
  }, [allPosts, searchTerm]);

  // Top 3 by view count for "Most Helpful"
  const mostHelpful = useMemo(() => {
    return [...publishedPosts].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 3);
  }, [publishedPosts]);

  // Group remaining posts by category
  const categorizedPosts = useMemo(() => {
    const groups: Record<string, typeof publishedPosts> = {};
    publishedPosts.forEach(post => {
      const cat = post.blog_categories?.name || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(post);
    });
    return groups;
  }, [publishedPosts]);

  // Featured post = most recent
  const featuredPost = publishedPosts[0] || null;

  const handleNewsletterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubscribing(true);
    setTimeout(() => {
      setEmail('');
      setIsSubscribing(false);
      alert('Thank you for subscribing!');
    }, 1000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try { return format(new Date(dateStr), 'MMMM d, yyyy'); } catch { return ''; }
  };

  const categories = [
    { slug: 'tenant-help-center', title: 'Tenant Help Center', description: 'Section 8 & Housing Assistance', icon: Home, color: 'bg-openkey-blue/10 text-openkey-blue', bgColor: 'bg-openkey-blue/5' },
    { slug: 'landlord-resources', title: 'Landlord Resources', description: 'Property Management & Investment', icon: TrendingUp, color: 'bg-openkey-green/10 text-openkey-green', bgColor: 'bg-openkey-green/5' },
    { slug: 'real-estate-tips-tricks', title: 'Real Estate Tips & Tricks', description: 'Market Insights & Strategies', icon: FileText, color: 'bg-muted text-muted-foreground', bgColor: 'bg-muted/50' },
    { slug: 'property-tools-landlord-tips', title: 'Property Tools & Landlord Tips', description: 'Management & Maintenance', icon: Award, color: 'bg-openkey-blue/10 text-openkey-blue', bgColor: 'bg-openkey-blue/5' },
    { slug: 'case-studies-success-stories', title: 'Case Studies & Success Stories', description: 'Real Examples', icon: Users, color: 'bg-openkey-green/10 text-openkey-green', bgColor: 'bg-openkey-green/5' },
  ];

  const CATEGORY_ICONS: Record<string, { icon: typeof Home; color: string }> = {
    'Tenant Guide': { icon: Home, color: 'bg-openkey-blue/10 text-openkey-blue' },
    'Landlords': { icon: TrendingUp, color: 'bg-openkey-green/10 text-openkey-green' },
    'Real Estate Tips/Tricks': { icon: FileText, color: 'bg-muted text-muted-foreground' },
  };

  const PostCardSkeleton = () => (
    <Card>
      <CardContent className="p-6 space-y-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-12 mb-12 text-white relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-5xl font-bold mb-4">
              Unlock Knowledge.
              <br />
              Empower Action.
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Real estate insights for tenants, landlords, and investors — all in one place.
            </p>
            
            <div className="flex gap-4 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search articles"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white text-gray-900 border-0 h-12"
                />
              </div>
            </div>
          </div>
          
          <div className="absolute right-8 top-8 opacity-20">
            <div className="w-32 h-32 bg-gradient-to-br from-openkey-blue to-openkey-green rounded-2xl flex items-center justify-center transform rotate-12">
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                <div className="w-8 h-8 bg-openkey-blue rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {categories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <Link key={index} to={`/blog/category/${category.slug}`}>
                <Card className={`${category.bgColor} border-0 hover:shadow-lg transition-all duration-300 cursor-pointer group h-full`}>
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 ${category.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{category.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
                    <Button variant="link" className="p-0 h-auto text-openkey-blue hover:text-openkey-blue/80">
                      Read Summary →
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Spotlight Feature - most recent post */}
        {featuredPost && (
          <Link to={`/blog/${featuredPost.slug}`}>
            <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white border-0 mb-12 hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">Spotlight Feature</h2>
                    <h3 className="text-xl font-semibold mb-3">{featuredPost.title}</h3>
                    <p className="text-gray-300 mb-4">{featuredPost.excerpt || 'Read the latest from OpenKey Housing.'}</p>
                    {featuredPost.blog_categories?.name && (
                      <span className="inline-block bg-openkey-blue text-white px-3 py-1 rounded-full text-sm">
                        {featuredPost.blog_categories.name}
                      </span>
                    )}
                  </div>
                  <div className="ml-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-openkey-blue to-openkey-green rounded-2xl flex items-center justify-center">
                      <TrendingUp className="h-12 w-12 text-white" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Most Helpful Articles */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-8">Most Helpful</h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <PostCardSkeleton />
              <PostCardSkeleton />
              <PostCardSkeleton />
            </div>
          ) : mostHelpful.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No articles found{searchTerm ? ` for "${searchTerm}"` : ''}.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {mostHelpful.map((post) => (
                <Card key={post.id} className="hover:shadow-lg transition-shadow duration-300 cursor-pointer">
                  <Link to={`/blog/${post.slug}`}>
                    <CardContent className="p-6">
                      {post.blog_categories?.name && (
                        <div className="bg-openkey-blue/10 text-openkey-blue px-3 py-1 rounded-full text-sm inline-block mb-4">
                          {post.blog_categories.name}
                        </div>
                      )}
                      <h3 className="text-xl font-semibold text-foreground mb-3 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground mb-4 line-clamp-3">
                        {post.excerpt || 'Read more...'}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">{formatDate(post.published_at || post.created_at)}</span>
                          <span className="text-xs text-muted-foreground">{((post.view_count || 0) / 1000).toFixed(1)}K views</span>
                        </div>
                        <Button variant="link" className="p-0 h-auto text-openkey-blue">
                          Read more →
                        </Button>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Articles by Category Section */}
        {!isLoading && Object.keys(categorizedPosts).length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-8">Articles by Category</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Object.entries(categorizedPosts).slice(0, 3).map(([catName, posts]) => {
                const catMeta = CATEGORY_ICONS[catName] || { icon: FileText, color: 'bg-muted text-muted-foreground' };
                const CatIcon = catMeta.icon;
                return (
                  <div key={catName}>
                    <div className="flex items-center mb-6">
                      <div className={`w-10 h-10 ${catMeta.color} rounded-xl flex items-center justify-center mr-3`}>
                        <CatIcon className="h-5 w-5" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">{catName}</h3>
                    </div>
                    <div className="space-y-4">
                      {posts.slice(0, 3).map((article) => (
                        <Card key={article.id} className="hover:shadow-md transition-shadow duration-300 cursor-pointer">
                          <Link to={`/blog/${article.slug}`}>
                            <CardContent className="p-4">
                              <h4 className="font-semibold text-foreground mb-2 line-clamp-2">
                                {article.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {article.excerpt || 'Read more...'}
                              </p>
                              <span className="text-xs text-muted-foreground">{formatDate(article.published_at || article.created_at)}</span>
                            </CardContent>
                          </Link>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Newsletter Signup Section */}
        <section className="py-16 bg-gradient-subtle-blue rounded-2xl">
          <div className="max-w-4xl mx-auto text-center px-4">
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Stay ahead of the housing market</h2>
              <p className="text-lg text-muted-foreground">Join the OpenKey newsletter — weekly insights, no spam.</p>
            </div>

            <div className="glass-card rounded-2xl p-8 border border-border max-w-3xl mx-auto">
              <div className="grid md:grid-cols-2 gap-4 mb-8 text-left">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-openkey-gold" />
                    <span className="text-foreground">Real estate market insights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-openkey-gold" />
                    <span className="text-foreground">Landlord & tenant tools</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-openkey-gold" />
                    <span className="text-foreground">Buying, selling, and investing tips</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-openkey-gold" />
                    <span className="text-foreground">Realtor updates and Section 8 news</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-openkey-gold" />
                    <span className="text-foreground">Exclusive deals and property alerts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-openkey-gold" />
                    <span className="text-foreground">Early access to new features</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleNewsletterSignup} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="submit" disabled={isSubscribing} className="bg-openkey-gold hover:bg-openkey-gold/90 text-black font-semibold">
                  {isSubscribing ? 'Subscribing...' : 'Subscribe'}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
