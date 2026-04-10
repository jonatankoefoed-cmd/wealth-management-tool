"use client";

import Image from "next/image";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from "@/components/ui/card";

interface BackgroundWidgetProps {
    /** Title of the metric or widget */
    title: string;
    /** Primary value to display */
    value?: string | number;
    /** Icon to display in the top right */
    icon: LucideIcon;
    /** Background image URL */
    backgroundImage?: string;
    /** 
     * Local vs Remote image handling.
     * 'local' assumes the image is in public/ folder.
     * 'remote' assumes an external URL (e.g. Unsplash).
     */
    imageSource?: 'local' | 'remote';
    /** 
     * Overlay style to ensure text readability.
     * - 'gradient-bottom': Subtle gradient from bottom (good for general use)
     * - 'glass-panel': Frosted glass effect (premium)
     * - 'dimmed': Overall darkening (good for busy photos)
     * - 'none': No overlay
     */
    overlayVariant?: 'gradient-bottom' | 'glass-panel' | 'dimmed' | 'none';
    /** Optional extra content (e.g. ExplainDrawer) */
    footer?: React.ReactNode;
    /** Custom classes */
    className?: string;
}

export function BackgroundWidget({
    title,
    value,
    icon,
    backgroundImage,
    imageSource = 'remote',
    overlayVariant = 'gradient-bottom',
    footer,
    className
}: BackgroundWidgetProps) {

    // Premium default gradient if no image is provided
    // Using the "Warm neutral + Sage" palette, but with a richer gradient for depth
    const defaultGradient = "bg-gradient-to-br from-[#E8E5D4] to-[#FAF8EF]";

    return (
        <Card className={cn(
            "relative overflow-hidden border-0 shadow-card h-full min-h-[160px] group transition-all duration-300 hover:shadow-float",
            !backgroundImage && defaultGradient,
            className
        )}>
            {/* Background Image Layer */}
            {backgroundImage && (
                <div className="absolute inset-0 z-0">
                    <Image
                        src={backgroundImage}
                        alt="Widget background"
                        fill
                        className={cn(
                            "object-cover transition-transform duration-700 group-hover:scale-105",
                            imageSource === 'remote' ? "opacity-90" : "opacity-100"
                        )}
                        quality={90}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                </div>
            )}

            {/* Overlay Layer */}
            <div className={cn(
                "absolute inset-0 z-10 pointer-events-none transition-opacity duration-300",
                overlayVariant === 'gradient-bottom' && "bg-gradient-to-t from-black/60 via-black/10 to-transparent",
                overlayVariant === 'glass-panel' && "bg-white/10 backdrop-blur-[2px] border border-white/20",
                overlayVariant === 'dimmed' && "bg-black/30",
                // If no image, we don't need a heavy overlay, but we might want a subtle texture
                !backgroundImage && "bg-transparent"
            )} />

            {/* Content Layer */}
            <CardContent className="relative z-20 flex flex-col justify-between h-full p-5">
                <div className="flex justify-between items-start">
                    <h3 className={cn(
                        "text-sm font-medium tracking-wide uppercase",
                        backgroundImage ? "text-white/90 shadow-sm" : "text-brand-text2"
                    )}>
                        {title}
                    </h3>
                    <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        backgroundImage ? "bg-white/20 backdrop-blur-md text-white" : "bg-brand-surface text-brand-text2"
                    )}>
                        <Icon
                            icon={icon}
                            size={18}
                            // If background exists, force 'invert' (white), else use default 'secondary'
                            color={(backgroundImage ? 'invert' : 'secondary') as any}
                        />
                    </div>
                </div>

                <div className="mt-4">
                    {value && (
                        <div className={cn(
                            "text-3xl font-semibold tabular-nums tracking-tight",
                            backgroundImage ? "text-white drop-shadow-md" : "text-brand-text1"
                        )}>
                            {value}
                        </div>
                    )}

                    {footer && (
                        <div className="mt-2">
                            {footer}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
