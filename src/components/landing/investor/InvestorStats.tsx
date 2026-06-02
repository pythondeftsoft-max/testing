import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface StatItem {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
}

function useCountUp(target: number, duration = 2000, startOnView = true) {
  const [value, setValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const startRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) {
      setHasStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, hasStarted]);

  return { value, elementRef };
}

function Stat({ label, value, prefix = '', suffix = '' }: StatItem) {
  const { value: counted, elementRef } = useCountUp(value, 2500);
  
  return (
    <motion.div 
      ref={elementRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="investor-glass-strong rounded-2xl p-8 text-center relative overflow-hidden group"
    >
      {/* Gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(186_100%_50%)] to-[hsl(160_84%_39%)] opacity-60" />
      
      <div className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
        {prefix}{counted.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-white/50 font-medium uppercase tracking-wider">
        {label}
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(186_100%_50%/0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  );
}

interface InvestorStatsProps {
  stats?: StatItem[];
}

export default function InvestorStats({ stats }: InvestorStatsProps) {
  const defaultStats: StatItem[] = [
    { label: 'Total AUM Tracked', value: 2400, prefix: '$', suffix: 'M+' },
    { label: 'Portfolios Monitored', value: 320, suffix: '+' },
    { label: 'Markets Covered', value: 47, suffix: '+' },
    { label: 'Avg Response Time', value: 24, suffix: 'hrs' },
  ];

  const displayStats = stats || defaultStats;

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Trusted by Institutional Investors
          </h2>
          <p className="text-white/50">
            Real numbers. Real portfolios. Real results.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {displayStats.map((stat, index) => (
            <Stat key={index} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
