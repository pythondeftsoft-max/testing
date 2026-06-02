import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

interface Props {
  label?: string;
  value: string | null; // data URL
  onChange: (dataUrl: string | null) => void;
}

const SignaturePad: React.FC<Props> = ({ label, value, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(!!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
    }
  }, [value]);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const data = canvasRef.current!.toDataURL('image/png');
    onChange(data);
  };

  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    setHasInk(false);
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="border rounded-md bg-white touch-none">
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          className="w-full h-[150px] block"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{hasInk ? 'Signed' : 'Sign with finger or stylus'}</span>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          <Eraser className="w-3 h-3 mr-1" />Clear
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;
