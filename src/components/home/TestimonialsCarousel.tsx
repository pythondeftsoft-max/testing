import { Carousel, CarouselContent, CarouselItem, CarouselDots } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import Autoplay from "embla-carousel-autoplay";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TestimonialsCarousel() {
  const { t } = useLanguage();
  
  const testimonials = [
    {
      quote: t('testimonials.quote1'),
      author: t('testimonials.author1'),
      role: t('testimonials.role1'),
    },
    {
      quote: t('testimonials.quote2'),
      author: t('testimonials.author2'),
      role: t('testimonials.role2'),
    },
    {
      quote: t('testimonials.quote3'),
      author: t('testimonials.author3'),
      role: t('testimonials.role3'),
    },
  ];

  return (
    <section className="relative py-20 px-4">
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-openkey-blue/10 via-background to-openkey-gold/10"
        aria-hidden="true"
      />
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-gradient-blue-gold">{t('testimonials.title')}</h2>
        <Carousel
          className="w-full"
          opts={{ loop: true, align: "start" }}
          plugins={[
            Autoplay({ delay: 5500, stopOnInteraction: false, stopOnMouseEnter: true }) as any,
          ]}
        >
          <CarouselContent>
            {testimonials.map((testimonial, i) => (
              <CarouselItem key={i} className="px-4">
                <Card className="bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl card-hover animate-enter">
                  <CardContent className="p-8 md:p-10">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -4, scale: 1.01 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="flex flex-col items-center hover-scale"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-blue flex items-center justify-center shadow-md mb-4 text-white font-semibold">
                        {testimonial.author.split(' ').map(n => n[0]).slice(0,2).join('')}
                      </div>
                      <p className="text-lg md:text-xl text-foreground leading-relaxed">"{testimonial.quote}"</p>
                      <div className="mt-6 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{testimonial.author}</span> • {testimonial.role}
                      </div>
                    </motion.div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselDots />
        </Carousel>
      </div>
    </section>
  );
}