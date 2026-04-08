import React from 'react';

interface WordmarkProps {
    /** Height in pixels (width scales proportionally) */
    height?: number;
    /** Color (uses currentColor by default for theme-awareness) */
    color?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Wordmark component displays the app's text logo.
 * Uses currentColor for theme-aware coloring.
 */
export function Wordmark({
    height = 32,
    color = 'currentColor',
    className = ''
}: WordmarkProps) {
    const width = height * 3.75; // Maintain aspect ratio

    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 120 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`wordmark ${className}`}
            aria-label="Wealth"
        >
            <text
                x="0"
                y="24"
                fontFamily="Inter, system-ui, sans-serif"
                fontSize="24"
                fontWeight="500"
                fill={color}
            >
                Wealth
            </text>
        </svg>
    );
}

export default Wordmark;
