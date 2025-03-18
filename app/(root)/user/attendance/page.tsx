"use client";

import {useState} from "react";
import {
    Box,
    createTheme,
    ThemeProvider,
    CssBaseline,
    Container,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Paper,
    Typography,
} from "@mui/material";

import Loader from "@/app/components/Loader/Loader";
import useSWR from "swr";
import axios from "axios";

import {Attendance, User} from "@prisma/client";
import {LoadingButton} from "@mui/lab";
import {toDate} from "@/utils";
import toast from "react-hot-toast";

const defaultTheme = createTheme();

const fetcher = async (...args: Parameters<typeof axios>) => {
    const res = await axios(...args);
    return res.data;
};

const MyAttendancePage = () => {
    const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
    const [attendanceError, setAttendanceError] = useState<string>("");

    const {data, isLoading, mutate} = useSWR("/api/user/attendance", fetcher);

    const handleAttendance = async () => {
        try {
            setAttendanceLoading(true);
            setAttendanceError("");
            const res = await axios.patch("/api/user/attendance");
            if (res.status === 200) {
                toast.success("You're present for today.");
                await mutate("/api/user/attendance");
            }
        } catch (err: Error | any) {
            setAttendanceError(err.response.data.error);
        } finally {
            setAttendanceLoading(false);
        }
    };

    if (isLoading) {
        return <Loader/>;
    }

    return (
        <ThemeProvider theme={defaultTheme}>
            <Container component="main" maxWidth="lg">
                <CssBaseline/>

                <Box sx={{mt: 3, display: "flex", justifyContent: "space-between"}}>
                    <LoadingButton
                        loading={attendanceLoading}
                        variant="outlined"
                        color="success"
                        type={"button"}
                        disabled={data?.data?.length > 0 && data?.data[0].isPresent}
                        onClick={handleAttendance}
                    >
                        Make Present for Today
                    </LoadingButton>
                    {attendanceError && (
                        <Typography color={"error"} variant="body1">
                            {attendanceError}
                        </Typography>
                    )}
                </Box>

                <TableContainer
                    component={Paper}
                    sx={{
                        mt: 3,
                    }}
                >
                    <Table
                        sx={{minWidth: 650, textAlign: "center"}}
                        aria-label="simple table"
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell></TableCell>
                                <TableCell>Name & Email</TableCell>
                                <TableCell>From & To</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Attend</TableCell>
                                <TableCell>Attend Time</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data?.data?.length > 0 &&
                                data?.data
                                    ?.sort((a: Attendance, b: Attendance) => {
                                        return (
                                            new Date(b.updatedAt).getTime() -
                                            new Date(a.updatedAt).getTime()
                                        );
                                    })
                                    .map(
                                        (
                                            attendance: Attendance & {
                                                student: User;
                                            }
                                        ) => (
                                            <TableRow key={attendance.id}>
                                                <TableCell></TableCell>
                                                <TableCell>
                                                    {attendance.student.name}
                                                    <br/>
                                                    {attendance.student.email}
                                                </TableCell>
                                                <TableCell>
                                                    From: {toDate(attendance.fromTime)}
                                                    <br/>
                                                    To: {toDate(attendance.toTime)}
                                                </TableCell>
                                                <TableCell>
                                                    {
                                                        new Date(attendance.createdAt)
                                                            .toISOString()
                                                            .split("T")[0]
                                                    }
                                                </TableCell>
                                                <TableCell
                                                    sx={{
                                                        color: !attendance.isPresent ? "error" : "success",
                                                    }}
                                                >
                                                    {!attendance.isPresent ? "Absent" : "Present"}
                                                </TableCell>
                                                <TableCell>
                                                    {attendance.isPresent
                                                        ? new Date(
                                                            attendance.updatedAt
                                                        ).toLocaleTimeString()
                                                        : "N/A"}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Container>
        </ThemeProvider>
    );
};

export default MyAttendancePage;
