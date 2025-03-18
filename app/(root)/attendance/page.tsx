"use client";

import { useState } from "react";
import {
  Box,
  createTheme,
  ThemeProvider,
  CssBaseline,
  Container,
  Grid,
  FormControl,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Typography,
} from "@mui/material";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import axios from "axios";
import toast from "react-hot-toast";
import { LoadingButton } from "@mui/lab";

import useSWR from "swr";
import { Attendance, User } from "@prisma/client";

import Loader from "@/app/components/Loader/Loader";
import { toDate } from "@/utils";
const defaultTheme = createTheme();

const getCurrentTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const fetcher = async (...args: Parameters<typeof axios>) => {
  const res = await axios(...args);
  return res.data;
};

const AttendancePage: React.FC = () => {
  const { data, isLoading } = useSWR("/api/attendance", fetcher);

  const [attendanceError, setAttendanceError] = useState<string>("");

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FieldValues>({
    defaultValues: {
      fromTime: getCurrentTime(),
      toTime: getCurrentTime(),
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      setAttendanceError("");
      const res = await axios.post("/api/attendance", data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.status === 201) {
        toast.success(res.data.message);
        setAttendanceError("");
      }
    } catch (err: Error | any) {
      setAttendanceError(err.response.data.error);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="lg">
        <CssBaseline />

        <Box
          component={"form"}
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          sx={{ mt: 3 }}
        >
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <TextField
                    type="time"
                    variant="outlined"
                    required
                    fullWidth
                    label={"From"}
                    autoFocus
                    {...register("fromTime", { required: true })}
                    helperText={
                      errors.fromTime &&
                      typeof errors.fromTime.message === "string"
                        ? errors.fromTime.message
                        : null
                    }
                    error={!!errors?.fromTime?.message}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <TextField
                    type="time"
                    variant="outlined"
                    fullWidth
                    label={"To"}
                    autoFocus
                    {...register("toTime", { required: true })}
                    helperText={
                      errors.toTime && typeof errors.toTime.message === "string"
                        ? errors.toTime.message
                        : null
                    }
                    error={!!errors?.toTime?.message}
                  />
                </FormControl>
              </Grid>
            </Grid>
            <Box
              sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}
            >
              <LoadingButton
                loading={isSubmitting}
                variant="contained"
                type={"submit"}
              >
                Create Attendance
              </LoadingButton>
              {attendanceError && (
                <Typography color={"error"} variant="body1">
                  {attendanceError}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        <TableContainer
          component={Paper}
          sx={{
            mt: 3,
          }}
        >
          <Table
            sx={{ minWidth: 650, textAlign: "center" }}
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
                          <br />
                          {attendance.student.email}
                        </TableCell>
                        <TableCell>
                          From: {toDate(attendance.fromTime)}
                          <br />
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

export default AttendancePage;
