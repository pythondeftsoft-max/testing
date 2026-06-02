import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { format } from 'date-fns';
import { useMemo } from 'react';

const LatestArticles = () => {
  const { data: allPosts, isLoading } = useBlogPosts();

  const latestPosts = useMemo(() => {
    return (allPosts || [])
      .filter(p => p.status === 'published')
      .slice(0, 3);
  }, [allPosts]);

  if (!isLoading && latestPosts.length === 0) return null;

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-primary" />
              Latest from the Blog
            </h2>
            <p className="text-muted-foreground mt-2">
              Housing insights for tenants, landlords, and investors
            </p>
          </div>
          <Link to="/blog">
            <Button variant="outline" className="hidden sm:flex items-center gap-2">
              View All Articles
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestPosts.map(post => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <Card className="h-full hover:shadow-lg transition-shadow duration-300 group">
                  {post.featured_image_url && (
                    <img
                      src={post.featured_image_url}
                      alt={post.featured_image_alt || post.title}
                      className="w-full h-40 object-cover rounded-t-lg"
                      loading="lazy"
                    />
                  )}
                  <CardContent className="p-6">
                    {post.blog_categories?.name && (
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                        {post.blog_categories.name}
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-foreground mt-3 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {post.excerpt || 'Read more...'}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {post.published_at
                        ? format(new Date(post.published_at), 'MMM d, yyyy')
                        : format(new Date(post.created_at), 'MMM d, yyyy')}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Internal linking sweep — popular Section 8 city pages */}
        <div className="mt-12 pt-8 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
            Browse Section 8 Housing by City
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { slug: 'new-york-ny', name: 'New York, NY' },
              { slug: 'los-angeles-ca', name: 'Los Angeles, CA' },
              { slug: 'chicago-il', name: 'Chicago, IL' },
              { slug: 'houston-tx', name: 'Houston, TX' },
              { slug: 'philadelphia-pa', name: 'Philadelphia, PA' },
              { slug: 'phoenix-az', name: 'Phoenix, AZ' },
              { slug: 'saratoga-springs-ny', name: 'Saratoga Springs, NY' },
              { slug: 'buffalo-ny', name: 'Buffalo, NY' },
            ].map((c) => (
              <Link
                key={c.slug}
                to={`/section-8-housing/${c.slug}`}
                className="text-sm px-3 py-1 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {c.name}
              </Link>
            ))}
            <Link
              to="/section-8-housing"
              className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
            >
              View all cities →
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link to="/blog">
            <Button variant="outline" className="items-center gap-2">
              View All Articles
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LatestArticles;
