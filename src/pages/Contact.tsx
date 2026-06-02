
import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, MapPin, Clock, MessageSquare, Users, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

const Contact = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: t('contact.messageSent'),
      description: t('contact.messageResponse'),
    });

    setFormData({
      name: '',
      email: '',
      subject: '',
      category: '',
      message: '',
    });

    setLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">{t('contact.title')}</h1>
          <p className="text-xl text-muted-foreground">
            {t('contact.subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  {t('contact.getInTouch')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium">{t('contact.email')}</h3>
                    <p className="text-muted-foreground">support@openkeyhousing.com</p>
                    <p className="text-sm text-muted-foreground">{t('contact.available247')}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium">{t('contact.businessHours')}</h3>
                    <div className="text-muted-foreground text-sm space-y-1">
                      <p>{t('contact.hours247')}</p>
                      <p>{t('contact.daysPerYear')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('contact.quickSupport')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-medium text-primary">{t('contact.forTenants')}</h4>
                    <p className="text-sm text-primary/80">{t('contact.housingSupportDesc')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg">
                  <Building className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h4 className="font-medium text-emerald-600">{t('contact.forLandlords')}</h4>
                    <p className="text-sm text-emerald-600/80">{t('contact.propertyListingDesc')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('contact.sendMessage')}</CardTitle>
                <CardDescription>
                  {t('contact.sendMessageDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">{t('contact.name')} *</Label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">{t('contact.emailAddress')} *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category">{t('contact.category')}</Label>
                      <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={t('contact.selectCategory')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tenant-support">{t('contact.tenantSupport')}</SelectItem>
                          <SelectItem value="landlord-support">{t('contact.landlordSupport')}</SelectItem>
                          <SelectItem value="technical-issue">{t('contact.technicalIssue')}</SelectItem>
                          <SelectItem value="billing">{t('contact.billingQuestion')}</SelectItem>
                          <SelectItem value="partnership">{t('contact.partnershipInquiry')}</SelectItem>
                          <SelectItem value="media">{t('contact.mediaInquiry')}</SelectItem>
                          <SelectItem value="other">{t('contact.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>

                  <div>
                    <Label htmlFor="subject">{t('contact.subject')} *</Label>
                    <Input
                      id="subject"
                      type="text"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      required
                      className="mt-1"
                      placeholder={t('contact.subjectPlaceholder')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">{t('contact.message')} *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      required
                      className="mt-1 min-h-32"
                      placeholder={t('contact.messagePlaceholder')}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={loading}
                  >
                    {loading ? t('contact.sending') : t('contact.send')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{t('contact.beforeContact')}</CardTitle>
            <CardDescription>
              {t('contact.beforeContactDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">{t('contact.section8Questions')}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('contact.section8QuestionsDesc')}
                </p>
                <Button variant="outline" size="sm">
                  {t('contact.viewSection8Info')}
                </Button>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">{t('contact.applicationProcess')}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('contact.applicationProcessDesc')}
                </p>
                <Button variant="outline" size="sm">
                  {t('contact.viewProcessGuide')}
                </Button>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">{t('contact.generalFAQ')}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('contact.generalFAQDesc')}
                </p>
                <Button variant="outline" size="sm">
                  {t('contact.viewFAQ')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default Contact;
