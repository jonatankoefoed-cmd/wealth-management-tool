import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell
} from 'recharts';
import { motion } from 'framer-motion';

// Design Tokens
const COLORS = {
    sage: '#A4B0A3',
    charcoal: '#332E2D',
    gray: '#7E8187',
    grid: '#E5E7EB',
    hover: '#8C9A8B', // Darker sage
};

interface AllocationChartProps {
    data: { name: string; value: number; color?: string }[];
    height?: number;
}

/**
 * The "Stacks" Component
 * For static snapshots like asset allocation or budget breakdown.
 */
export const AssetAllocationChart = ({ data, height = 300 }: AllocationChartProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full"
        >
            <ResponsiveContainer width="100%" height={height}>
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                    barCategoryGap={16}
                >
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        width={100}
                        tick={{ fill: COLORS.charcoal, fontSize: 13, fontWeight: 500 }}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '12px',
                            border: '1px solid #f3f4f6',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                    />
                    <Bar
                        dataKey="value"
                        radius={[0, 6, 6, 0]}
                        barSize={24}
                        animationDuration={1000}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color || COLORS.sage}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </motion.div>
    );
};
