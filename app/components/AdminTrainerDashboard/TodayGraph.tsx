import React from "react";
import {Attendance} from "@prisma/client";
import {PieChart, Pie, Cell, ResponsiveContainer} from 'recharts';
import Typography from "@mui/material/Typography";

const TodayGraph = ({attendanceData}: {
    attendanceData: Attendance[]
}) => {
    const data = [
        {name: 'Present', value: attendanceData?.filter((attendance: Attendance) => attendance?.isPresent && attendance.date === new Date().toISOString().split("T")[0]).length},
        {name: 'Absent', value: attendanceData?.filter((attendance: Attendance) => !attendance?.isPresent && attendance.date === new Date().toISOString().split("T")[0]).length},
    ];

    const COLORS = ['#1ABA00', '#ff1e1e'];

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({
                                       cx,
                                       cy,
                                       midAngle,
                                       innerRadius,
                                       outerRadius,
                                       percent,
                                   }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <React.Fragment>
            <Typography variant="h6" sx={{mb: 2}}>
                Today&#39;s Attendance
            </Typography>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {data?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </React.Fragment>
    );
};

export default TodayGraph;
