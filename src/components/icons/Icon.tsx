import React from 'react';
import { LucideIcon } from 'lucide-react';

interface IconProps {
    /** Lucide icon component */
    icon: LucideIcon;
    /** Size in pixels (16, 18, 20, 24) */
    size?: 16 | 18 | 20 | 24;
    /** Color using CSS color tokens */
    color?: 'primary' | 'secondary' | 'muted' | 'accent' | 'invert';
    /** Additional CSS classes */
    className?: string;
    /** Accessible label for screen readers */
    label?: string;
}

const colorMap = {
    primary: '#111827',   // text-1
    secondary: '#6B7280', // text-2
    muted: '#9CA3AF',     // text-3
    accent: '#2563EB',    // accent
    invert: '#FFFFFF',    // text-invert
};

const strokeWidthMap = {
    16: 1.5,
    18: 1.5,
    20: 2,
    24: 2,
};

/**
 * Icon wrapper component that enforces consistent styling.
 * Uses Lucide icons with standardized sizes, stroke widths, and colors.
 * 
 * Usage:
 * ```tsx
 * import { Plus, Settings, Trash2 } from 'lucide-react';
 * 
 * <Icon icon={Plus} size={20} color="accent" />
 * <Icon icon={Settings} size={24} color="secondary" />
 * ```
 */
export function Icon({
    icon: LucideIconComponent,
    size = 20,
    color = 'secondary',
    className = '',
    label,
}: IconProps) {
    return (
        <LucideIconComponent
            size={size}
            strokeWidth={strokeWidthMap[size]}
            color={colorMap[color]}
            className={`icon ${className}`}
            aria-label={label}
            aria-hidden={!label}
        />
    );
}

export default Icon;
