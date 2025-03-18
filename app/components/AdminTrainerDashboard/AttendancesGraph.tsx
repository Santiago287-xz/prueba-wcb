import React from 'react';
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} from 'recharts';
import {Attendance} from "@prisma/client";
import Typography from "@mui/material/Typography";

const AttendanceGraph = ({attendanceData}: {
    attendanceData: Attendance[]
}) => {
    // Process attendance data to create chart data

    let timeSlots = [] as unknown as string[]
    attendanceData?.forEach(attendance => {
        if (!timeSlots.includes(attendance.date)) {
            timeSlots.push(attendance.date)
        }
    })

    const presentCounts = timeSlots?.map((timeSlot: string) =>
        attendanceData.filter((attendance: Attendance) => attendance?.isPresent && attendance?.date === timeSlot).length
    );
    const absentCounts = timeSlots?.map((timeSlot: string) =>
        attendanceData.filter((attendance: Attendance) => !attendance?.isPresent && attendance?.date === timeSlot).length
    );

    const chartData = timeSlots?.map((timeSlot: string, index: number) => ({
        timeSlot,
        present: presentCounts[index],
        absent: absentCounts[index],
    }));

    return (
        <React.Fragment>
            <Typography variant="h6" sx={{mb: 2}}>
                Attendance Graph
            </Typography>
            <ResponsiveContainer>
                <BarChart data={chartData}>
                    <XAxis dataKey="timeSlot"/>
                    <YAxis/>
                    <CartesianGrid strokeDasharray="3 3"/>
                    <Tooltip/>
                    <Legend/>
                    <Bar dataKey="present" fill="rgba(75, 192, 192, 0.6)"/>
                    <Bar dataKey="absent" fill="rgba(255, 99, 132, 0.6)"/>
                </BarChart>
            </ResponsiveContainer>
        </React.Fragment>
    );
};

export default AttendanceGraph;
