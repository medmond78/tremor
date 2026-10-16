'use client';

import { memo, useId } from 'react';
import { calculateSparklineGeometry } from '@/lib/sparkline';

interface ProbabilitySparklineProps {
  from: number;
  to: number;
  width?: number;
  height?: number;
  className?: string;
  showEndpoints?: boolean;
}

export const ProbabilitySparkline = memo(function ProbabilitySparkline({
  from,
  to,
  width = 72,
  height = 24,
  className = '',
  showEndpoints = true,
}: ProbabilitySparklineProps) {
  const gradientId = useId();
  const geometry = calculateSparklineGeometry(from, to, width, height, 3);
  const { linePath, areaPath, isPositive, points } = geometry;

  const strokeColor = isPositive ? '#10b981' : '#f0674f'; // leaf or coral
  const fillStopColor = isPositive ? '#10b981' : '#f0674f';
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  return (
    <div
      className={`relative inline-flex items-center overflow-visible ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id={`spark-fill-${gradientId}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={fillStopColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={fillStopColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* 50% Threshold Reference Line if crossed */}
        {from < 50 !== to < 50 && (
          <line
            x1="2"
            y1={height / 2}
            x2={width - 2}
            y2={height / 2}
            stroke="#1b5fbf"
            strokeDasharray="2 2"
            strokeOpacity="0.35"
            strokeWidth="1"
          />
        )}

        {/* Shaded Area Under Curve */}
        <path
          d={areaPath}
          fill={`url(#spark-fill-${gradientId})`}
          className="transition-all duration-300"
        />

        {/* Shockwave Stroke Line */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-300"
        />

        {/* Endpoints */}
        {showEndpoints && (
          <>
            {/* Start anchor dot */}
            <circle
              cx={firstPoint.x}
              cy={firstPoint.y}
              r="2"
              fill={strokeColor}
              opacity="0.6"
            />

            {/* End dot with subtle breathing ring */}
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="4.5"
              fill={strokeColor}
              opacity="0.2"
              className="animate-ping"
              style={{ transformOrigin: `${lastPoint.x}px ${lastPoint.y}px` }}
            />
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="2.5"
              fill={strokeColor}
            />
          </>
        )}
      </svg>
    </div>
  );
});
