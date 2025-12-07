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
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Issue Trends
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                New issues reported vs resolved over time
            </Typography>
            <Box sx={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                    <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }} 
                            tickLine={false}
                            axisLine={{ stroke: "#e5e7eb" }}
                        />
                        <YAxis 
                            tick={{ fontSize: 12 }} 
                            tickLine={false}
                            axisLine={{ stroke: "#e5e7eb" }}
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            }}
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
