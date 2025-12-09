import { Box, Paper, Typography } from "@mui/material";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface TrendDataPoint {
    date: string;
    reported: number;
    resolved: number;
}

interface TrendChartProps {
    data: TrendDataPoint[];
}

const TrendChart = ({ data }: TrendChartProps) => {
    const formattedData = data.map((point) => ({
        ...point,
        date: new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));

    return (
        <Paper elevation={0} sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
        }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: '#f8fafc' }}>
                Issue Trends
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: '#94a3b8' }}>
                New issues reported vs resolved over time
            </Typography>
            <Box sx={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                    <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                            tickLine={false}
                            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                            tickLine={false}
                            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "rgba(15, 23, 42, 0.95)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: 8,
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
                                color: "#f8fafc"
                            }}
                            itemStyle={{ color: '#f8fafc' }}
                            labelStyle={{ color: '#94a3b8' }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="reported"
                            name="New Issues"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={{ fill: "#ef4444", r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="resolved"
                            name="Resolved"
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={{ fill: "#22c55e", r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
};

export default TrendChart;
