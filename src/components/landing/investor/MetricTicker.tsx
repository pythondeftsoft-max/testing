import { useEffect, useRef, useState } from 'react';
import { TrendingUp, Activity, Building2, Globe } from 'lucide-react';

interface Metric {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: React.ReactNode;
}

function useCountUp(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min(1, (ts - startRef.current) / duration);
      // Easing function for smoother animation
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function MetricItem({ label, value, prefix = '', suffix = '', icon }: Metric) {
  const counted = useCountUp(value, 2500);
  
  return (
    <div className="flex items-center gap-3 px-6 py-3">
      <div className="text-[hsl(186_100%_50%)] opacity-80">
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-white tracking-tight">
          {prefix}{counted.toLocaleString()}{suffix}
        </span>
        <span className="text-sm text-white/50 font-medium">
          {label}
        </span>
      </div>
    </div>
  );
}

export default function MetricTicker() {
  const metrics: Metric[] = [
    { 
      label: 'Total AUM Tracked', 
      value: 2400, 
      prefix: '$', 
      suffix: 'M+',
      icon: <TrendingUp className="h-4 w-4" />
    },
    { 
      label: 'Market Liquidity', 
      value: 890, 
      prefix: '$', 
      suffix: 'M+',
      icon: <Activity className="h-4 w-4" />
    },
    { 
      label: 'Active Portfolios', 
      value: 1250, 
      suffix: '+',
      icon: <Building2 className="h-4 w-4" />
    },
    { 
      label: 'Markets Covered', 
      value: 47, 
      suffix: '+',
      icon: <Globe className="h-4 w-4" />
    },
  ];

  return (
    <div className="w-full investor-glass border-b border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center md:justify-between flex-wrap gap-2">
          {metrics.map((metric, index) => (
            <MetricItem key={index} {...metric} />
          ))}
        </div>
      </div>
    </div>
  );
}
