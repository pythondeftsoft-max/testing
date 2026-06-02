
import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 animate-fade-in">About Us</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Creating the world's first platform for global income-generating asset portfolios
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Mission Section */}
        <div className="bg-card rounded-lg border shadow-sm p-8 md:p-12 mb-12 animate-fade-in">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-card-foreground mb-4">Our Mission</h2>
            <div className="w-24 h-1 bg-primary mx-auto mb-6"></div>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-xl md:text-2xl text-card-foreground leading-relaxed mb-8">
                We're not just expanding - we're creating an entirely new category. OpenKey is building the world's first platform that truly understands successful investors don't just own "properties" - they own diverse portfolios of income-generating assets across multiple countries and asset classes.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                From residential rentals to commercial real estate, from international properties to alternative investments, we're revolutionizing how investors think about, manage, and optimize their global asset portfolios. This isn't evolution - it's category creation.
              </p>
            </div>
            
            {/* Vision Statement */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 md:p-8 border border-primary/20 mb-8">
              <div className="flex items-start space-x-4">
                <div className="w-1 h-16 bg-primary rounded-full flex-shrink-0"></div>
                <div>
                  <h3 className="text-xl font-semibold text-card-foreground mb-4">Category Creation Vision</h3>
                  <p className="text-lg md:text-xl text-card-foreground leading-relaxed font-medium">
                    We're pioneering the Global Asset Portfolio Intelligence category - where traditional property management meets international investment strategy, alternative assets, and AI-powered optimization to create the ultimate platform for modern wealth builders.
                  </p>
                </div>
              </div>
            </div>
            
            {/* What We're Building */}
            <div className="bg-muted/30 rounded-lg p-6 md:p-8">
              <h3 className="text-2xl font-semibold text-card-foreground mb-6 text-center">What We're Building</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-primary-foreground rounded-full"></span>
                    </div>
                    <span className="text-muted-foreground leading-relaxed">Global portfolio management across multiple countries and currencies</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-primary-foreground rounded-full"></span>
                    </div>
                    <span className="text-muted-foreground leading-relaxed">Multi-asset class integration beyond traditional real estate</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-primary-foreground rounded-full"></span>
                    </div>
                    <span className="text-muted-foreground leading-relaxed">AI-powered investment optimization and risk analysis</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-primary-foreground rounded-full"></span>
                    </div>
                    <span className="text-muted-foreground leading-relaxed">Unified analytics for diverse income-generating assets</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Leadership Section */}
        <div className="bg-card rounded-lg border shadow-sm p-8 mb-12 animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-card-foreground mb-4">Leading a New Category</h2>
            <div className="w-24 h-1 bg-primary mx-auto mb-6"></div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/20">
              <h3 className="text-2xl font-semibold text-foreground mb-4">Global First</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The first platform designed from the ground up for international asset portfolio management, breaking down geographical and asset class silos.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Multi-country property management
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Cross-border investment analytics
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Currency and regulatory compliance
                </li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-secondary/50 to-secondary/80 rounded-lg p-6 border border-secondary/50">
              <h3 className="text-2xl font-semibold text-foreground mb-4">Asset Agnostic</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Beyond traditional real estate - we understand modern portfolios include REITs, fractional ownership, short-term rentals, commercial properties, and emerging asset classes.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Residential and commercial properties
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Alternative investment tracking
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Fractional and digital assets
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-accent/20 to-accent/30 rounded-lg p-6 border border-accent/40">
              <h3 className="text-2xl font-semibold text-foreground mb-4">Intelligence Driven</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                AI-powered insights that understand the complexity of modern investment portfolios and provide actionable intelligence for optimization.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Predictive market analysis
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Portfolio optimization algorithms
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Risk assessment automation
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Automation & Technology Section */}
        <div className="bg-card rounded-lg border shadow-sm p-8 md:p-12 mb-12 animate-fade-in">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-card-foreground mb-4">Powered by Automation</h2>
            <div className="w-24 h-1 bg-primary mx-auto mb-6"></div>
          </div>
          
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                Our platform leverages cutting-edge automation technology to streamline every aspect of the housing placement process, making it faster and more efficient for everyone involved.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary text-2xl">⚡</span>
                </div>
                <h3 className="text-xl font-semibold text-card-foreground mb-3">Smart Webhooks</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Instant notifications and updates keep all parties informed throughout the application process without manual intervention.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary text-2xl">🔧</span>
                </div>
                <h3 className="text-xl font-semibold text-card-foreground mb-3">Edge Functions</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Serverless computing handles complex background tasks like document processing and communication workflows seamlessly.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-semibold text-card-foreground mb-3">Intelligent Matching</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Automated algorithms match tenants with suitable properties based on preferences, location, and compatibility factors.
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-muted/30 to-muted/20 rounded-lg p-6 md:p-8 border border-muted/50">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-semibold text-card-foreground mb-4">Effortless Experience</h3>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="w-2 h-2 bg-primary-foreground rounded-full"></span>
                      </div>
                      <span>Automated application processing and status updates</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="w-2 h-2 bg-primary-foreground rounded-full"></span>
                      </div>
                      <span>Real-time communication between tenants and landlords</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="w-2 h-2 bg-primary-foreground rounded-full"></span>
                      </div>
                      <span>Background verification and document processing</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-2xl font-semibold text-card-foreground mb-4">Behind the Scenes</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    While you focus on finding or filling housing, our automation works 24/7 to handle the technical complexities. From processing applications to managing communications, our edge functions and webhook integrations ensure everything happens smoothly without you having to think about it.
                  </p>
                  <p className="text-sm text-muted-foreground/80 italic">
                    This means faster placements, fewer errors, and more time for what matters most - creating successful housing partnerships.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-card rounded-lg border shadow-sm p-6 text-center hover:shadow-md transition-shadow duration-300 animate-fade-in">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary text-2xl">🌍</span>
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-3">Global by Design</h3>
            <p className="text-muted-foreground leading-relaxed">
              Built for investors who think beyond borders, with native support for international portfolios and cross-border investments.
            </p>
          </div>
          
          <div className="bg-card rounded-lg border shadow-sm p-6 text-center hover:shadow-md transition-shadow duration-300 animate-fade-in">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary text-2xl">🔬</span>
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-3">Innovation First</h3>
            <p className="text-muted-foreground leading-relaxed">
              We don't follow existing categories - we create new ones by understanding what investors actually need, not what's traditionally been offered.
            </p>
          </div>
          
          <div className="bg-card rounded-lg border shadow-sm p-6 text-center hover:shadow-md transition-shadow duration-300 animate-fade-in">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary text-2xl">📈</span>
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-3">Intelligence Driven</h3>
            <p className="text-muted-foreground leading-relaxed">
              Every feature is powered by data and AI to provide insights that help investors make smarter decisions across their entire portfolio.
            </p>
          </div>
        </div>

        {/* Impact Section */}
        <div className="bg-gradient-to-r from-primary to-primary/90 rounded-lg text-primary-foreground p-8 md:p-12 text-center animate-scale-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Creating the Future of Investment Management</h2>
          <p className="text-lg text-primary-foreground/90 max-w-4xl mx-auto leading-relaxed">
            We're not just building another property management tool - we're defining what the future of global asset portfolio management looks like. 
            Join us as we create the category that will power the next generation of international investors and wealth builders.
          </p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default About;
