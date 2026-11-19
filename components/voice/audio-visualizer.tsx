'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  volume: number; // 0-1
  isActive: boolean;
  variant?: 'input' | 'output';
  className?: string;
}

export function AudioVisualizer({ 
  volume, 
  isActive, 
  variant = 'input',
  className 
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const barsRef = useRef<number[]>([]);

  // Number of bars
  const barCount = 32;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize bars
    if (barsRef.current.length === 0) {
      barsRef.current = new Array(barCount).fill(0);
    }

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / barCount;
      const maxBarHeight = height * 0.8;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Update and draw bars
      for (let i = 0; i < barCount; i++) {
        // Target height based on volume and position (center bars taller)
        const centerFactor = 1 - Math.abs(i - barCount / 2) / (barCount / 2);
        const targetHeight = isActive 
          ? volume * maxBarHeight * (0.3 + 0.7 * centerFactor) * (0.5 + Math.random() * 0.5)
          : 4;

        // Smooth interpolation
        barsRef.current[i] += (targetHeight - barsRef.current[i]) * 0.15;

        const barHeight = Math.max(4, barsRef.current[i]);
        const x = i * barWidth + barWidth * 0.15;
        const y = (height - barHeight) / 2;

        // Gradient color based on variant
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        if (variant === 'input') {
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)'); // blue
          gradient.addColorStop(1, 'rgba(139, 92, 246, 0.8)'); // purple
        } else {
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)'); // emerald
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.8)'); // green
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth * 0.7, barHeight, 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [volume, isActive, variant]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={48}
      className={cn(
        'opacity-transition',
        !isActive && 'opacity-30',
        className
      )}
    />
  );
}
