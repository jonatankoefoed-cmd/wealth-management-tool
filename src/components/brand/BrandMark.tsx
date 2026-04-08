import React from 'react';

interface BrandMarkProps {
    /** Size in pixels */
    size?: number;
    /** Color (uses currentColor by default for theme-awareness) */
    color?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * BrandMark component displays the app's logo mark.
 * Renders the ascending bars symbol representing wealth growth.
 * Uses currentColor for theme-aware coloring.
 */
export function BrandMark({
    size = 48,
    color = 'currentColor',
    className = ''
}: BrandMarkProps) {
    const scale = size / 48;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`brand-mark ${className}`}
            aria-label="Wealth App Logo"
        >
            <rect x="8" y="32" width="8" height="12" rx="3" fill={color} />
            <rect x="20" y="22" width="8" height="22" rx="3" fill={color} />
            <rect x="32" y="10" width="8" height="34" rx="3" fill={color} />
        </svg>
    );
}

export default BrandMark;
