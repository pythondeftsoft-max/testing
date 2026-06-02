import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

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

export default function StatsBar({
  className,
}: { className?: string }) {
  const { t } = useLanguage();
  
  const stats: StatItem[] = [
    { label: t('stats.voucherHoldersMatched'), value: 1800, suffix: "+" },
    { label: t('stats.landlordsOnboarded'), value: 650, suffix: "+" },
    { label: t('stats.avgDaysToFill'), value: 18 },
    { label: t('stats.statesServed'), value: 11, suffix: "+" },
  ];

  return (
    <section className={cn("relative py-10 px-4", className)} aria-label="OpenKey impact statistics">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((s, idx) => (
            <Stat key={idx} label={s.label} value={s.value} suffix={s.suffix} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, suffix }: StatItem) {
  const counted = useCountUp(value);
  return (
    <div className="glass-card rounded-xl p-5 text-center card-hover">
      <div className="text-3xl md:text-4xl font-extrabold text-gradient-blue-gold">
        {counted}
        {suffix || ""}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
