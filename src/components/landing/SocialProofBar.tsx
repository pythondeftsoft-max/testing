import { useEffect, useRef, useState } from 'react';

interface StatItem {
  label: string;
  value: number;
  suffix?: string;
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min(1, (ts - startRef.current) / duration);
      setValue(Math.floor(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function Stat({ label, value, suffix }: StatItem) {
  const counted = useCountUp(value);
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-primary">
        {counted}{suffix || ''}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

interface SocialProofBarProps {
  stats?: StatItem[];
}

export default function SocialProofBar({ stats }: SocialProofBarProps) {
  const defaultStats: StatItem[] = [
    { label: 'Voucher Holders Matched', value: 1800, suffix: '+' },
    { label: 'Landlords Onboarded', value: 650, suffix: '+' },
    { label: 'Avg Days to Fill', value: 18 },
    { label: 'States Served', value: 11, suffix: '+' },
  ];

  const displayStats = stats || defaultStats;

  return (
    <section className="py-16 px-4 bg-card border-y border-border">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {displayStats.map((stat, index) => (
            <Stat key={index} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
