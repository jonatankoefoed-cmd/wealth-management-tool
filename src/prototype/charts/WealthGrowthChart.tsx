import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    TooltipProps
} from 'recharts';
import { motion } from 'framer-motion';

// Design Tokens (Hardcoded for prototype - import from config later)
const COLORS = {
    sage: '#A4B0A3',
    sageLight: '#D1D8D0', // Computed tint
    charcoal: '#332E2D',
    gray: '#7E8187',
    grid: '#E5E7EB',
};

interface DataPoint {
    date: string;
    [key: string]: number | string;
}

interface SeriesConfig {
    key: string;
    color: string;
    name: string;
    gradient?: boolean;
}

interface AnimatedAreaChartProps {
    data: DataPoint[];
    series: SeriesConfig[];
    height?: number;
    showGrid?: boolean;
}

/**
 * Brand-aligned Tooltip Component
 */
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm p-3 border border-gray-100 rounded-xl shadow-card text-sm">
                <p className="text-gray-500 mb-1 font-medium">{label}</p>

                {payload.map((entry: any) => (
                    <div key={entry.name} className="flex items-center gap-2">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-brand-text1 font-semibold">
                            {entry.name}: {new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(entry.value as number)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

/**
 * The "Mountain" Chart Component
 * Optimized for displaying net worth / asset growth over time.
 */
export const WealthGrowthChart = ({
    data,
    series,
    height = 350,
    showGrid = true
}: AnimatedAreaChartProps) => {

    // Animation variants for container entry
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants as any}
            className="w-full h-full relative"
        >
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        {series.map((s) => (
                            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={s.color} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>

                    {showGrid && (
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke={COLORS.grid}
                            opacity={0.5}
                        />
                    )}

                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: COLORS.gray, fontSize: 12 }}
                        dy={10}
                        minTickGap={30}
                    />

                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: COLORS.gray, fontSize: 12 }}
                        tickFormatter={(value) =>
                            new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(value)
                        }
                    />

                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: COLORS.gray, strokeWidth: 1, strokeDasharray: '4 4' }}
                    />

                    {series.map((s, index) => (
                        <Area
                            key={s.key}
                            type="monotone"
                            dataKey={s.key}
                            stroke={s.color}
                            fill={`url(#grad-${s.key})`}
                            strokeWidth={2}
                            animationDuration={1500}
                            animationBegin={index * 200}
                            name={s.name}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </motion.div>
    );
};
