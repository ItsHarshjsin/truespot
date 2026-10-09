import React from 'react';
import { TruthBadgeType, TRUTH_BADGES } from '../types';

interface TruthBadgeProps {
  type: TruthBadgeType;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  className?: string;
}

export const TruthBadge: React.FC<TruthBadgeProps> = ({
  type,
  size = 'md',
  showDescription = false,
  className = '',
}) => {
  const config = TRUTH_BADGES[type] || TRUTH_BADGES.UNRESOLVED;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm font-bold',
  }[size];

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <span
        style={{
          color: config.color,
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        }}
        className={`inline-flex items-center space-x-1.5 rounded-full border font-mono font-semibold tracking-wide uppercase transition-all ${sizeClasses}`}
      >
        <span
          style={{ backgroundColor: config.color }}
          className="w-1.5 h-1.5 rounded-full animate-pulse"
        />
        <span>{config.label}</span>
      </span>
      {showDescription && (
        <span className="text-[11px] text-zinc-400 mt-1 max-w-xs leading-tight">
          {config.description}
        </span>
      )}
    </div>
  );
};
