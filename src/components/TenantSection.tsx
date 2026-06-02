
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const TenantSection = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    city: '',
    zipCode: '',
    phoneType: '',
    voucherStatus: '',
    rentRange: '',
    housingAuthorityIssuer: '',
    bedroomsApproved: '',
    moveInTiming: '',
    creditScore: '',
    evictionHistory: '',
    evictionTimeAgo: '',
    hasPets: '',
    petType: '',
    hasAccessibilityNeeds: false,
    accessibilityDetails: '',
    felonies: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    // Basic validation
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'Zip code is required';
    if (!formData.phoneType) newErrors.phoneType = 'Phone type is required';
    
    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone validation (basic)
    if (formData.phoneNumber && !/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    // Step 2 validation
    if (currentStep >= 2) {
      if (!formData.voucherStatus) newErrors.voucherStatus = 'Voucher status is required';
      if (!formData.rentRange.trim()) newErrors.rentRange = 'Rent range is required';
      if (!formData.housingAuthorityIssuer.trim()) newErrors.housingAuthorityIssuer = 'Housing authority is required';
      if (!formData.bedroomsApproved) newErrors.bedroomsApproved = 'Bedrooms approved is required';
    }

    // Step 3 validation
    if (currentStep >= 3) {
      if (!formData.moveInTiming) newErrors.moveInTiming = 'Move-in timing is required';
      if (!formData.creditScore) newErrors.creditScore = 'Credit score is required';
    }

    // Step 4 validation
    if (currentStep >= 4) {
      if (!formData.evictionHistory) newErrors.evictionHistory = 'Eviction history is required';
      if (!formData.hasPets) newErrors.hasPets = 'Pet information is required';
      if (!formData.felonies.trim()) newErrors.felonies = 'Felony information is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Determine which step to show based on form completion
  useEffect(() => {
    const { firstName, lastName, phoneNumber, email, city } = formData;
    
    if (!firstName && !lastName && !phoneNumber && !email && !city) {
      setCurrentStep(1);
    } else if (firstName && lastName && phoneNumber && email && city && formData.zipCode && formData.phoneType) {
      if (!formData.voucherStatus) {
        setCurrentStep(2);
      } else if (formData.voucherStatus && formData.rentRange && formData.housingAuthorityIssuer && formData.bedroomsApproved) {
        if (!formData.moveInTiming) {
          setCurrentStep(3);
        } else if (formData.moveInTiming && formData.creditScore) {
          setCurrentStep(4);
        }
      }
    }
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Please fix the errors",
        description: "Some required fields are missing or invalid.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Store form data in sessionStorage to pre-populate after account creation
      sessionStorage.setItem('tenant_application_data', JSON.stringify(formData));
      
      toast({
        title: "Application Data Saved!",
        description: "Please create your tenant account to complete your application.",
      });
      
      // Redirect to tenant signup page
      navigate('/auth?mode=signup&type=tenant');
    } catch (error) {
      console.error('Error saving application data:', error);
      toast({
        title: "Error",
        description: "There was an error saving your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormComplete = () => {
    const requiredFields = [
      'firstName', 'lastName', 'phoneNumber', 'email', 'city', 'zipCode', 'phoneType',
      'voucherStatus', 'rentRange', 'housingAuthorityIssuer', 'bedroomsApproved',
      'moveInTiming', 'creditScore', 'evictionHistory', 'hasPets', 'felonies'
    ];
    
    return requiredFields.every(field => formData[field as keyof typeof formData]);
  };

  return (
    <section id="tenant-form" className="py-16 px-4 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Get Started Today - Tenant Application
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We work with Section 8 voucher holders to find quality, affordable housing. 
            Our service is completely free for tenants.
          </p>
        </div>

        <Card className="glass-card border border-border">
          <CardHeader className="bg-gradient-blue-gold text-white">
            <CardTitle className="text-2xl text-center">Complete Your Application - It's Free!</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Basic Information */}
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                      First Name *
                    </Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      placeholder="Your first name"
                      required
                      className={`mt-1 ${errors.firstName ? 'border-red-500' : ''}`}
                    />
                    {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                      Last Name *
                    </Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      placeholder="Your last name"
                      required
                      className={`mt-1 ${errors.lastName ? 'border-red-500' : ''}`}
                    />
                    {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">
                      Phone Number *
                    </Label>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => handleChange('phoneNumber', e.target.value)}
                      placeholder="(555) 123-4567"
                      type="tel"
                      required
                      className={`mt-1 ${errors.phoneNumber ? 'border-red-500' : ''}`}
                    />
                    {errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phoneType" className="text-sm font-medium text-gray-700">
                      Phone Type *
                    </Label>
                    <Select value={formData.phoneType} onValueChange={(value) => handleChange('phoneType', value)}>
                      <SelectTrigger className={`mt-1 ${errors.phoneType ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select phone type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iphone">iPhone</SelectItem>
                        <SelectItem value="android">Android</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.phoneType && <p className="text-red-500 text-sm mt-1">{errors.phoneType}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="your.email@example.com"
                      type="email"
                      required
                      className={`mt-1 ${errors.email ? 'border-red-500' : ''}`}
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                      City *
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="Your city"
                      required
                      className={`mt-1 ${errors.city ? 'border-red-500' : ''}`}
                    />
                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="zipCode" className="text-sm font-medium text-gray-700">
                    Zip Code *
                  </Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleChange('zipCode', e.target.value)}
                    placeholder="12345"
                    required
                    className={`mt-1 max-w-xs ${errors.zipCode ? 'border-red-500' : ''}`}
                  />
                  {errors.zipCode && <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>}
                </div>
              </div>

              {/* Step 2: Housing Information - Appears after basic info is filled */}
              {currentStep >= 2 && (
                <div className="animate-fade-in space-y-6 border-t pt-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Housing Information</h3>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">
                      Section 8 Voucher Status *
                    </Label>
                    <RadioGroup
                      value={formData.voucherStatus}
                      onValueChange={(value) => handleChange('voucherStatus', value)}
                      className="flex flex-wrap gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="voucher-yes" />
                        <Label htmlFor="voucher-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="in-progress" id="voucher-progress" />
                        <Label htmlFor="voucher-progress">In-progress</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="voucher-no" />
                        <Label htmlFor="voucher-no">No</Label>
                      </div>
                    </RadioGroup>
                    {errors.voucherStatus && <p className="text-red-500 text-sm mt-1">{errors.voucherStatus}</p>}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="rentRange" className="text-sm font-medium text-gray-700">
                        Rent Range *
                      </Label>
                      <Input
                        id="rentRange"
                        value={formData.rentRange}
                        onChange={(e) => handleChange('rentRange', e.target.value)}
                        placeholder="e.g., $800-$1200"
                        required
                        className={`mt-1 ${errors.rentRange ? 'border-red-500' : ''}`}
                      />
                      {errors.rentRange && <p className="text-red-500 text-sm mt-1">{errors.rentRange}</p>}
                    </div>
                    <div>
                      <Label htmlFor="housingAuthorityIssuer" className="text-sm font-medium text-gray-700">
                        Housing Authority Issuer *
                      </Label>
                      <Input
                        id="housingAuthorityIssuer"
                        value={formData.housingAuthorityIssuer}
                        onChange={(e) => handleChange('housingAuthorityIssuer', e.target.value)}
                        placeholder="Your housing authority"
                        required
                        className={`mt-1 ${errors.housingAuthorityIssuer ? 'border-red-500' : ''}`}
                      />
                      {errors.housingAuthorityIssuer && <p className="text-red-500 text-sm mt-1">{errors.housingAuthorityIssuer}</p>}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">
                      Bedrooms Approved *
                    </Label>
                    <RadioGroup
                      value={formData.bedroomsApproved}
                      onValueChange={(value) => handleChange('bedroomsApproved', value)}
                      className="flex flex-wrap gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="studio-1br" id="bed-studio" />
                        <Label htmlFor="bed-studio">Studio/1BR</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="2br" id="bed-2br" />
                        <Label htmlFor="bed-2br">2BR</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="3br" id="bed-3br" />
                        <Label htmlFor="bed-3br">3BR</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="4br" id="bed-4br" />
                        <Label htmlFor="bed-4br">4BR</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="5br-plus" id="bed-5br" />
                        <Label htmlFor="bed-5br">5BR+</Label>
                      </div>
                    </RadioGroup>
                    {errors.bedroomsApproved && <p className="text-red-500 text-sm mt-1">{errors.bedroomsApproved}</p>}
                  </div>
                </div>
              )}

              {/* Step 3: Timeline & Preferences - Appears after housing info is filled */}
              {currentStep >= 3 && (
                <div className="animate-fade-in space-y-6 border-t pt-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Timeline & Preferences</h3>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">
                      Move-in Timing *
                    </Label>
                    <RadioGroup
                      value={formData.moveInTiming}
                      onValueChange={(value) => handleChange('moveInTiming', value)}
                      className="flex flex-wrap gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="asap" id="timing-asap" />
                        <Label htmlFor="timing-asap">ASAP</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="30-days" id="timing-30" />
                        <Label htmlFor="timing-30">Within 30 Days</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1-2-months" id="timing-1-2" />
                        <Label htmlFor="timing-1-2">1–2 Months</Label>
                      </div>
                    </RadioGroup>
                    {errors.moveInTiming && <p className="text-red-500 text-sm mt-1">{errors.moveInTiming}</p>}
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">
                      Credit Score *
                    </Label>
                    <RadioGroup
                      value={formData.creditScore}
                      onValueChange={(value) => handleChange('creditScore', value)}
                      className="flex flex-wrap gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="below-500" id="credit-below-500" />
                        <Label htmlFor="credit-below-500">Below 500</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="500-579" id="credit-500-579" />
                        <Label htmlFor="credit-500-579">500–579</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="580-639" id="credit-580-639" />
                        <Label htmlFor="credit-580-639">580–639</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="640-699" id="credit-640-699" />
                        <Label htmlFor="credit-640-699">640–699</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="700+" id="credit-700-plus" />
                        <Label htmlFor="credit-700-plus">700+</Label>
                      </div>
                    </RadioGroup>
                    {errors.creditScore && <p className="text-red-500 text-sm mt-1">{errors.creditScore}</p>}
                  </div>
                </div>
              )}

              {/* Step 4: Background Information - Appears after preferences are filled */}
              {currentStep >= 4 && (
                <div className="animate-fade-in space-y-6 border-t pt-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Background Information</h3>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">
                      Eviction History *
                    </Label>
                    <RadioGroup
                      value={formData.evictionHistory}
                      onValueChange={(value) => handleChange('evictionHistory', value)}
                      className="flex gap-4 mb-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="eviction-yes" />
                        <Label htmlFor="eviction-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="eviction-no" />
                        <Label htmlFor="eviction-no">No</Label>
                      </div>
                    </RadioGroup>
                    {errors.evictionHistory && <p className="text-red-500 text-sm mt-1">{errors.evictionHistory}</p>}
                    {formData.evictionHistory === 'yes' && (
                      <div className="mt-3 animate-fade-in">
                        <Label htmlFor="evictionTimeAgo" className="text-sm font-medium text-gray-700">
                          How long ago?
                        </Label>
                        <Input
                          id="evictionTimeAgo"
                          value={formData.evictionTimeAgo}
                          onChange={(e) => handleChange('evictionTimeAgo', e.target.value)}
                          placeholder="e.g., 2 years ago"
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">
                      Do you have pets? *
                    </Label>
                    <RadioGroup
                      value={formData.hasPets}
                      onValueChange={(value) => handleChange('hasPets', value)}
                      className="flex gap-4 mb-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="pets-yes" />
                        <Label htmlFor="pets-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="pets-no" />
                        <Label htmlFor="pets-no">No</Label>
                      </div>
                    </RadioGroup>
                    {errors.hasPets && <p className="text-red-500 text-sm mt-1">{errors.hasPets}</p>}
                    {formData.hasPets === 'yes' && (
                      <div className="mt-3 animate-fade-in">
                        <Label htmlFor="petType" className="text-sm font-medium text-gray-700">
                          What type of pets?
                        </Label>
                        <Input
                          id="petType"
                          value={formData.petType}
                          onChange={(e) => handleChange('petType', e.target.value)}
                          placeholder="e.g., Dog, Cat, etc."
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Checkbox
                        id="accessibilityNeeds"
                        checked={formData.hasAccessibilityNeeds}
                        onCheckedChange={(checked) => handleChange('hasAccessibilityNeeds', checked)}
                      />
                      <Label htmlFor="accessibilityNeeds" className="text-sm font-medium text-gray-700">
                        Do you have accessibility/disability needs?
                      </Label>
                    </div>
                    {formData.hasAccessibilityNeeds && (
                      <div className="mt-3 animate-fade-in">
                        <Label htmlFor="accessibilityDetails" className="text-sm font-medium text-gray-700">
                          Please provide details
                        </Label>
                        <Textarea
                          id="accessibilityDetails"
                          value={formData.accessibilityDetails}
                          onChange={(e) => handleChange('accessibilityDetails', e.target.value)}
                          placeholder="Describe your accessibility needs..."
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="felonies" className="text-sm font-medium text-gray-700">
                      Felony History *
                    </Label>
                    <Input
                      id="felonies"
                      value={formData.felonies}
                      onChange={(e) => handleChange('felonies', e.target.value)}
                      placeholder="Please describe any felony history or enter 'None'"
                      required
                      className={`mt-1 ${errors.felonies ? 'border-red-500' : ''}`}
                    />
                    {errors.felonies && <p className="text-red-500 text-sm mt-1">{errors.felonies}</p>}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || !isFormComplete()}
                variant="gold"
                size="lg"
                className="w-full"
              >
                {isSubmitting ? 'Saving Application...' : 'Create Account & Submit Application - It\'s Free!'}
              </Button>
              
              <p className="text-center text-sm text-muted-foreground mt-4">
                You'll be prompted to create a free tenant account to complete your application.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default TenantSection;
