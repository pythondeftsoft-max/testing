
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Maria Rodriguez",
      role: "Section 8 Tenant",
      content: "OpenKey helped me find a beautiful 3-bedroom home for my family in just two weeks. The process was so much easier than I expected!",
      rating: 5
    },
    {
      name: "David Chen",
      role: "Property Owner",
      content: "I've been working with OpenKey for 6 months. Their pre-screened tenants are reliable, and I haven't had a single late payment.",
      rating: 5
    },
    {
      name: "Jennifer Williams",
      role: "Real Estate Investor",
      content: "The wholesale deals and tenant-ready properties have been excellent. Great ROI and professional service throughout.",
      rating: 5
    }
  ];

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What Our Clients Say
          </h2>
          <p className="text-lg text-gray-600">
            Real stories from tenants, landlords, and investors we've helped
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-xl">★</span>
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div className="border-t pt-4">
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">Ready to join our satisfied clients?</p>
          <div className="w-full max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Submit Your Info. We'll Do the Rest.
            </h3>
            <p className="text-gray-600">
              Whether you're looking for housing, listing a property, or seeking investment opportunities, 
              we're here to help you succeed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
