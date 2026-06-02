import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

import { Player } from '@lottiefiles/react-lottie-player';

interface PremiumD3GaugeProps {
  value: number;
  max?: number;
  size?: number;
  showCelebration?: boolean;
  className?: string;
  interactive?: boolean;
  showTooltip?: boolean;
}

interface TooltipData {
  x: number;
  y: number;
  content: string;
  visible: boolean;
}

const PremiumD3Gauge: React.FC<PremiumD3GaugeProps> = ({
  value = 0,
  max = 100,
  size = 240,
  showCelebration = true,
  className = '',
  interactive = true,
  showTooltip = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData>({ x: 0, y: 0, content: '', visible: false });
  const uidRef = useRef(`g${Math.random().toString(36).slice(2)}`);
  const sheenTimerRef = useRef<d3.Timer | null>(null);
  // Normalize to percentage for consistent rendering
  const normalized = Math.max(0, Math.min(100, (value / max) * 100));
  const needsAttentionLocal = normalized < 70;

  // D3 configuration
  const margin = 20;
  const radius = (size - margin * 2) / 2;
  const thickness = 20;
  const startAngle = -Math.PI * 0.75; // Start at 135 degrees
  const endAngle = Math.PI * 0.75;    // End at 45 degrees
  const angleRange = endAngle - startAngle;

  // Color scales for different ranges
  const colorScale = d3.scaleLinear<string>()
    .domain([0, 30, 70, 85, 100])
    .range([
      'hsl(var(--health-critical))',
      'hsl(var(--health-needs-attention))',
      'hsl(var(--health-good))',
      'hsl(var(--health-excellent))',
      'hsl(var(--health-perfect))'
    ]);

  // Calculate angle for current value
  const valueAngle = startAngle + (normalized / 100) * angleRange;

  const createGauge = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous content
    // Stop previous sheen animation timer if running
    if (sheenTimerRef.current) {
      sheenTimerRef.current.stop();
      sheenTimerRef.current = null;
    }
    
    const centerX = size / 2;
    const centerY = size / 2;

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`)
      .attr('shape-rendering', 'geometricPrecision');


    // Define gradients (track and progress) before drawing
    const defs = svg.append('defs');

    const progressGradient = defs.append('linearGradient')
      .attr('id', `${uidRef.current}-progress`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');

    progressGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'hsl(var(--primary))')
      .attr('stop-opacity', 0.6);

    // Moving highlight stop for a flowing sheen
    const highlightStop = progressGradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', 'hsl(var(--primary))')
      .attr('stop-opacity', 1);

    progressGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'hsl(var(--primary))')
      .attr('stop-opacity', 0.9);

    // Respect prefers-reduced-motion for gradient animation
    try {
      const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        progressGradient.append('animateTransform')
          .attr('attributeName', 'gradientTransform')
          .attr('type', 'rotate')
          .attr('from', '0 0.5 0.5')
          .attr('to', '360 0.5 0.5')
          .attr('dur', '3s')
          .attr('repeatCount', 'indefinite');
      }
    } catch {}

    const trackGradient = defs.append('linearGradient')
      .attr('id', `${uidRef.current}-track`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');

    trackGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'hsl(var(--primary))')
      .attr('stop-opacity', 0.18);

    trackGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'hsl(var(--primary))')
      .attr('stop-opacity', 0.10);

    // Soft glow filter for progress
    const glowFilter = defs.append('filter')
      .attr('id', `${uidRef.current}-glow`)
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter.append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', 8)
      .attr('result', 'blur');

    glowFilter.append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('stdDeviation', 6)
      .attr('flood-color', 'hsl(var(--primary))')
      .attr('flood-opacity', 0.6);

    glowFilter.append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('stdDeviation', 10)
      .attr('flood-color', 'hsl(var(--primary))')
      .attr('flood-opacity', 0.35);

    const merge = glowFilter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create background arc (full track)
    const backgroundArc = d3.arc()
      .innerRadius(radius - thickness)
      .outerRadius(radius)
      .startAngle(startAngle)
      .endAngle(endAngle);

    g.append('path')
      .attr('d', backgroundArc({
        startAngle,
        endAngle,
        innerRadius: radius - thickness,
        outerRadius: radius
      }) as string)
      .attr('class', 'gauge-background')
      .style('fill', `url(#${uidRef.current}-track)`)
      .style('opacity', 1);


    // Threshold markers removed for a cleaner, modern look
    
    // Sheen overlay setup (flowing glow)
    const baseInner = radius - thickness;
    const baseOuter = radius;
    const centerRadius = baseInner + thickness / 2;

    // Clip path for current progress so sheen only appears on filled portion
    const clip = defs.append('clipPath')
      .attr('id', `${uidRef.current}-progress-clip`);

    const clipArc = d3.arc()
      .innerRadius(baseInner)
      .outerRadius(baseOuter)
      .startAngle(startAngle)
      .endAngle(valueAngle);

    clip.append('path')
      .attr('d', clipArc({
        startAngle,
        endAngle: valueAngle,
        innerRadius: baseInner,
        outerRadius: baseOuter
      }) as string);

    // Sheen gradient (transparent -> bright -> transparent)
    const sheenGradient = defs.append('linearGradient')
      .attr('id', `${uidRef.current}-sheen`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    sheenGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'hsl(var(--primary))')
      .attr('stop-opacity', 0);

    sheenGradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', 'hsl(var(--primary))')
      .attr('stop-opacity', 0.9);

    sheenGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'hsl(var(--primary))')
      .attr('stop-opacity', 0);

    // Create segmented progress arcs for hover interaction
    if (interactive) {
      // Underlay glow for filled portion (more evident)
      const baseInner = radius - thickness;
      const baseOuter = radius;
      const glowInner = Math.max(0, baseInner - 5);
      const glowOuter = baseOuter + 8;
      const glowArc = d3.arc()
        .innerRadius(glowInner)
        .outerRadius(glowOuter)
        .startAngle(startAngle)
        .endAngle(valueAngle);

      g.append('path')
        .attr('d', glowArc({
          startAngle,
          endAngle: valueAngle,
          innerRadius: glowInner,
          outerRadius: glowOuter
        }) as string)
        .style('fill', `url(#${uidRef.current}-progress)`)
        .style('filter', `url(#${uidRef.current}-glow)`)
        .style('opacity', 0.9);

      const segments = 10;
      const segmentAngle = angleRange / segments;
      
      for (let i = 0; i < segments; i++) {
        const segmentStart = startAngle + i * segmentAngle;
        const segmentEnd = startAngle + (i + 1) * segmentAngle;
        const segmentPct = ((i + 1) / segments) * 100;
        
        if (segmentPct <= normalized) {
          const segmentArc = d3.arc()
            .innerRadius(radius - thickness)
            .outerRadius(radius)
            .startAngle(segmentStart)
            .endAngle(segmentEnd)
            .padAngle(0.01);

          const path = g.append('path')
            .attr('d', segmentArc({
              startAngle: segmentStart,
              endAngle: segmentEnd,
              innerRadius: radius - thickness,
              outerRadius: radius
            }) as string)
            .attr('class', `gauge-segment-${i}`)
            .style('fill', `url(#${uidRef.current}-progress)`)
            .style('cursor', showTooltip ? 'pointer' : 'default')
            .style('transition', 'opacity 0.2s ease')
            .style('filter', `url(#${uidRef.current}-glow)`);

          if (showTooltip) {
            path
              .on('mouseenter', function(event) {
                d3.select(this).style('opacity', 0.85);
                const rect = svgRef.current?.getBoundingClientRect();
                if (rect) {
                  const prevPct = (i / segments) * 100;
                  setTooltip({
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                    content: `Range: ${Math.round(prevPct)}-${Math.round(segmentPct)}%`,
                    visible: true
                  });
                }
              })
              .on('mouseleave', function() {
                d3.select(this).style('opacity', 1);
                setTooltip(prev => ({ ...prev, visible: false }));
              });
          }
        }
      }
    } else {
      // Single progress arc with glow and flowing gradient
      const baseInner = radius - thickness;
      const baseOuter = radius;
      const glowInner = Math.max(0, baseInner - 5);
      const glowOuter = baseOuter + 8;

      const progressArc = d3.arc()
        .innerRadius(baseInner)
        .outerRadius(baseOuter)
        .startAngle(startAngle)
        .endAngle(valueAngle);

      const glowArc = d3.arc()
        .innerRadius(glowInner)
        .outerRadius(glowOuter)
        .startAngle(startAngle)
        .endAngle(valueAngle);

      // Glow underlay
      const glowPath = g.append('path')
        .attr('d', glowArc({
          startAngle,
          endAngle: startAngle + 0.0001,
          innerRadius: glowInner,
          outerRadius: glowOuter
        }) as string)
        .style('fill', `url(#${uidRef.current}-progress)`)
        .style('filter', `url(#${uidRef.current}-glow)`)
        .style('opacity', 0.9);

      // Crisp top fill
      const progressPath = g.append('path')
        .attr('d', progressArc({
          startAngle,
          endAngle: startAngle + 0.0001,
          innerRadius: baseInner,
          outerRadius: baseOuter
        }) as string)
        .style('fill', `url(#${uidRef.current}-progress)`);

      // Animate both paths together
      const tween = function(this: SVGPathElement) {
        const interpolate = d3.interpolate(startAngle, valueAngle);
        return function(t: number) {
          const currentAngle = interpolate(t);
          const p = progressArc({
            startAngle,
            endAngle: currentAngle,
            innerRadius: baseInner,
            outerRadius: baseOuter
          }) as string;
          const gpath = glowArc({
            startAngle,
            endAngle: currentAngle,
            innerRadius: glowInner,
            outerRadius: glowOuter
          }) as string;
          progressPath.attr('d', p);
          glowPath.attr('d', gpath);
          return p;
        };
      };

      progressPath.transition()
        .duration(1500)
        .ease(d3.easeElasticOut.amplitude(1).period(0.3))
        .attrTween('d', tween as any);

      glowPath.transition()
        .duration(1500)
        .ease(d3.easeElasticOut.amplitude(1).period(0.3))
        .attrTween('d', tween as any);
    }

    // Sheen overlay on top (flowing glow along filled arc only)
    try {
      const prefersReducedMotion2 = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const r = (radius - thickness) + thickness / 2; // centerline of the band

      // Build a thin stroke path along the filled arc only
      const arcLine = d3.arc()
        .innerRadius(r)
        .outerRadius(r)
        .startAngle(startAngle)
        .endAngle(valueAngle);

      const sheenStroke = g.append('path')
        .attr('d', arcLine({ startAngle, endAngle: valueAngle, innerRadius: r, outerRadius: r }) as string)
        .attr('fill', 'none')
        .attr('stroke', `url(#${uidRef.current}-sheen)`) // bright moving band
        .attr('stroke-width', Math.max(2, thickness * 0.22))
        .attr('stroke-linecap', 'round')
        .style('filter', `url(#${uidRef.current}-glow)`) 
        .style('mix-blend-mode', 'screen')
        .style('opacity', 1);

      // Animate a short dash sliding along the filled arc
      const node = sheenStroke.node() as SVGPathElement | null;
      if (node && !prefersReducedMotion2 && value > 0) {
        const len = node.getTotalLength();
        const dash = Math.max(10, len * 0.18);
        sheenStroke.attr('stroke-dasharray', `${dash} ${len}`);

        sheenTimerRef.current = d3.timer((elapsed) => {
          // Move the dash smoothly along the arc
          const speed = len * 0.4; // px per second
          const offset = ((elapsed / 1000) * speed) % len;
          sheenStroke.attr('stroke-dashoffset', -offset);
        });
      } else if (node) {
        // Static highlight without animation
        const len = node.getTotalLength();
        const dash = Math.max(10, len * 0.18);
        sheenStroke
          .attr('stroke-dasharray', `${dash} ${len}`)
          .attr('stroke-dashoffset', 0);
      }
    } catch {}


    // Gradients are defined before drawing to ensure availability
  }, [value, max, size, radius, thickness, startAngle, endAngle, angleRange, colorScale, valueAngle, interactive, showTooltip]);

  useEffect(() => {
    createGauge();
    return () => {
      if (sheenTimerRef.current) {
        sheenTimerRef.current.stop();
        sheenTimerRef.current = null;
      }
    };
  }, [createGauge]);

  // Get status text based on score
  const getStatusText = (score: number): string => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    return 'Needs Attention';
  };

  // Get status color
  const getStatusColor = (score: number): string => {
    if (score >= 85) return 'text-health-excellent';
    if (score >= 70) return 'text-health-good';
    return 'text-health-needs-attention';
  };

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* SVG Gauge */}
      <div className="relative">
        <svg
          ref={svgRef}
          width={size}
          height={size}
          className="drop-shadow-lg"
          style={{ pointerEvents: interactive ? 'auto' : 'none' }}
        >
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            style={{ transform: 'translateY(12%)' }}
          >
            <div className={`text-3xl font-bold ${getStatusColor(normalized)}`}>
              {Math.round(normalized)}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {getStatusText(normalized)}
            </div>
          </motion.div>
        </div>

        {/* Interactive Tooltip */}
        {showTooltip && tooltip.visible && (
          <div
            ref={tooltipRef}
            className="absolute z-10 px-3 py-2 text-sm bg-popover border border-border rounded-md shadow-lg pointer-events-none"
            style={{
              left: tooltip.x + 10,
              top: tooltip.y - 10,
              transform: 'translateY(-100%)'
            }}
          >
            {tooltip.content}
          </div>
        )}

        {/* Celebration Animation */}
        {showCelebration && value >= 85 && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Player
              autoplay
              loop={false}
              src="https://assets2.lottiefiles.com/packages/lf20_5ttqtgd1.json"
              style={{ height: size, width: size }}
            />
          </motion.div>
        )}
      </div>

      {/* Status Indicator */}
      <motion.div
        className="flex items-center justify-center mt-4 space-x-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.4 }}
      >
        <div 
          className={`w-3 h-3 rounded-full ${needsAttentionLocal ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: colorScale(normalized) }}
        />
        <span className="text-sm font-medium text-foreground">
          Portfolio Health
        </span>
      </motion.div>

      {/* Real-time Indicator */}
      <motion.div
        className="absolute -top-2 -right-2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.2, duration: 0.3 }}
      >
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg" />
      </motion.div>
    </motion.div>
  );
};

export default PremiumD3Gauge;