
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";

const LandlordSection = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    propertyAddress: '',
    bedrooms: '',
    rent: '',
    availableDate: '',
    propertyType: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Landlord form submitted:', formData);
    toast({
      title: "Property Listed!",
      description: "We'll start matching pre-screened tenants to your property immediately.",
    });
    setFormData({
      name: '',
      phone: '',
      email: '',
      propertyAddress: '',
      bedrooms: '',
      rent: '',
      availableDate: '',
      propertyType: '',
      description: ''
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <section id="landlord-form" className="py-16 px-4 bg-blue-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            List Your Rental or Get Pre-Screened Tenants
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect with qualified Section 8 tenants who have been pre-screened and are ready to move. 
            Guaranteed rent and reliable tenants.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Pre-Screened Tenants</h3>
            <p className="text-gray-600 text-sm">All applicants verified for income, background, and rental history</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Guaranteed Rent</h3>
            <p className="text-gray-600 text-sm">Section 8 provides stable, on-time rent payments</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Fast Placement</h3>
            <p className="text-gray-600 text-sm">Reduce vacancy time with our efficient matching process</p>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle className="text-2xl text-center">List Your Property</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Your full name"
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    type="tel"
                    required
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <Input
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="your.email@example.com"
                  type="email"
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Address *
                </label>
                <Input
                  value={formData.propertyAddress}
                  onChange={(e) => handleChange('propertyAddress', e.target.value)}
                  placeholder="123 Main St, City, State ZIP"
                  required
                  className="w-full"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bedrooms *
                  </label>
                  <Select value={formData.bedrooms} onValueChange={(value) => handleChange('bedrooms', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Bedroom</SelectItem>
                      <SelectItem value="2">2 Bedrooms</SelectItem>
                      <SelectItem value="3">3 Bedrooms</SelectItem>
                      <SelectItem value="4">4+ Bedrooms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Rent *
                  </label>
                  <Input
                    value={formData.rent}
                    onChange={(e) => handleChange('rent', e.target.value)}
                    placeholder="$1,200"
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Date
                  </label>
                  <Input
                    value={formData.availableDate}
                    onChange={(e) => handleChange('availableDate', e.target.value)}
                    type="date"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type
                </label>
                <Select value={formData.propertyType} onValueChange={(value) => handleChange('propertyType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">Single Family House</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="duplex">Duplex</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe your property, amenities, and any special features..."
                  rows={4}
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg rounded-lg transition-all duration-300"
              >
                List My Property
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default LandlordSection;
