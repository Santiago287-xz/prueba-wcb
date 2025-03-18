"use client";

import useStudentsStore from "@/app/hooks/useStudentsStore";
import Loading from "@/app/loading";
import { LoadingButton } from "@mui/lab";
import {
  Autocomplete,
  Box,
  Container,
  createTheme,
  CssBaseline,
  Grid,
  TextareaAutosize,
  TextField,
  ThemeProvider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  Chip,
} from "@mui/material";

import AccessAlarmsIcon from "@mui/icons-material/AccessAlarms";
import { Fees, User } from "@prisma/client";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { PuffLoader } from "react-spinners";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Error from "next/error";
import { SessionUser } from "@/types";

const defaultTheme = createTheme();

const MONTHS = [
  { id: 1, name: "January" },
  { id: 2, name: "February" },
  { id: 3, name: "March" },
  { id: 4, name: "April" },
  { id: 5, name: "May" },
  { id: 6, name: "June" },
  { id: 7, name: "July" },
  { id: 8, name: "August" },
  { id: 9, name: "September" },
  { id: 10, name: "October" },
  { id: 11, name: "November" },
  { id: 12, name: "December" },
];
// 2021 - 2099
const YEARS = Array.from({ length: 79 }, (_, i) => i + 2021);
const YEAR_OBJECTS = YEARS.map((year, index) => ({
  id: index + 1,
  name: year,
}));

const fetcher = async (...args: Parameters<typeof axios>) => {
  const res = await axios(...args);
  return res.data;
};

const FeesPage: React.FC = () => {
  const { students, loading, fetchStudents } = useStudentsStore();

  const { data: userSession, status } = useSession();

  // State variables for storing selected values
  const [selected, setSelected] = useState<User | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0]);
  const [selectedYear, setSelectedYear] = useState(YEAR_OBJECTS[0]);

  const [reminderId, setReminderId] = useState<string>("");
  const [reminderLoading, setReminderLoading] = useState<boolean>(false);

  const [orderBy, setOrderBy] = useState<keyof Fees>("email"); // Field to sort by (default is "name")
  const [order, setOrder] = useState<"asc" | "desc">("asc"); // Sorting order (default is "asc")

  const { data, isLoading, mutate } = useSWR("/api/fees", fetcher);

  const fees = data?.fees;
  const sessionUser = userSession?.user as SessionUser;

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FieldValues>({
    defaultValues: {
      email: "",
      amount: 0,
      message: "",
      month: "",
      year: 0,
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      const res = await axios.post("/api/fees", data, {
        headers: {
          "Content-Type": "application/json",
        },
      });


      if (res.status === 201) {
        reset();
        toast.success(res.data.message);
        await mutate("/api/fees");
      }
    } catch (err: Error | any) {
      toast.error(err.response.data.error);
    }
  };

  const handleReminder = async (
    rmId: string,
    email: string,
    month: string,
    year: string
  ) => {
    setReminderId(rmId);
    setReminderLoading(true);

    try {
      const data = {
        userEmail: email,
        senderId: sessionUser.id,
        type: "reminder",
        notification_text: `You have not paid your fees for ${month} ${year}. Please pay your fees as soon as possible.`,
        pathName: "/user/fees",
      };

      const res = await axios.post("/api/notification", data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.status === 201) {
        toast.success("Notification Sent Successfully");
      }
    } catch (err: Error | any) {
      toast.error(err.response.data.error);
    } finally {
      setReminderId("");
      setReminderLoading(false);
    }
  };

  const handleSortChange = (property: keyof Fees) => () => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedData = useMemo(() => {
    if (fees && fees.length > 0) {
      return [...fees].sort((a: Fees, b: Fees) => {
        const valueA = a[orderBy];
        const valueB = b[orderBy];

        if (valueA === null && valueB === null) {
          return 0;
        } else if (valueA === null) {
          return order === "asc" ? 1 : -1;
        } else if (valueB === null) {
          return order === "asc" ? -1 : 1;
        }

        if (order === "asc") {
          return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
          return valueB < valueA ? -1 : valueB > valueA ? 1 : 0;
        }
      });
    }
    return [];
  }, [fees, orderBy, order]);

  if (loading || isLoading || status === "loading") {
    return <Loading />;
  }

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="md">
        <CssBaseline />
        <Box
          component="form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          sx={{ mt: 3 }}
        >
          <Grid container spacing={2} sx={{ mt: 3 }}>
            {/* Autocomplete for selecting a person */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                value={selected}
                onChange={(event, newValue) => {
                  setSelected(newValue);
                }}
                options={students || []}
                getOptionLabel={(person) => person?.email || ""}
                renderOption={(props, person) => (
                  <li {...props} key={person.id}>
                    {person.email}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select a person"
                    placeholder="Select a person"
                    required
                    fullWidth
                    {...register("email", { required: true })}
                    error={!!errors?.email?.message}
                    helperText={
                      errors.email && typeof errors.email.message === "string"
                        ? errors.email.message
                        : null
                    }
                  />
                )}
              />
            </Grid>
            {/* month */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                value={selectedMonth}
                onChange={(event, newValue) =>
                  newValue && setSelectedMonth(newValue)
                }
                options={MONTHS || []}
                getOptionLabel={(month) => month.name}
                renderOption={(props, month) => (
                  <li {...props} key={month.id}>
                    {month.name}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select a month"
                    placeholder="Select a month"
                    required
                    fullWidth
                    {...register("month", { required: true })}
                    error={!!errors?.month?.message}
                    helperText={
                      errors.month && typeof errors.month.message === "string"
                        ? errors.month.message
                        : null
                    }
                  />
                )}
              />
            </Grid>
            {/* Years */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                value={selectedYear}
                onChange={(event, newValue) =>
                  newValue && setSelectedYear(newValue)
                }
                options={YEAR_OBJECTS || []}
                getOptionLabel={(year) => year.name.toString()}
                renderOption={(props, year) => (
                  <li {...props} key={year.id}>
                    {year.name}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    type="text"
                    label="Select a year"
                    placeholder="Select a year"
                    required
                    fullWidth
                    {...register("year", {
                      required: true,
                      validate: {
                        positive: (value) =>
                          value > 0 || "Year must be positive",
                      },
                    })}
                    error={!!errors?.year?.message}
                    helperText={
                      errors.year && typeof errors.year.message === "string"
                        ? errors.year.message
                        : null
                    }
                  />
                )}
              />
            </Grid>
            {/* amount */}
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                label="Amount"
                placeholder="Enter the amount"
                defaultValue={0}
                required
                fullWidth
                {...register("amount", {
                  required: true,
                  valueAsNumber: true,
                  validate: {
                    positive: (value) =>
                      value > 0 || "Amount must be positive or greater than 0",
                  },
                })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextareaAutosize
                {...register("message", {
                  required: true,
                })}
                placeholder="Type your message here"
                style={{
                  width: "100%",
                  resize: "none",
                  fontSize: "16px",
                  lineHeight: "1.5",
                  padding: "12px",
                  background: "#fff",
                  border: "1px solid #d0d7de",
                  borderRadius: "5px",
                  boxShadow: "0px 2px 2px #f6f8fa",
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <LoadingButton
                type="submit"
                fullWidth
                loading={isSubmitting}
                loadingIndicator={<PuffLoader size={20} color={"blue"} />}
                variant="contained"
              >
                Add Fee
              </LoadingButton>
            </Grid>
          </Grid>
        </Box>

        {sortedData && sortedData.length > 0 && (
          <>
            <TableContainer
              sx={{
                mt: 4,
              }}
              component={Paper}
            >
              <Table sx={{ minWidth: 650 }} aria-label="simple table">
                <TableHead>
                  <TableRow>
                    <TableCell></TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "email"}
                        direction={order}
                        onClick={handleSortChange("email")}
                      >
                        Email
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "month"}
                        direction={order}
                        onClick={handleSortChange("month")}
                      >
                        Month
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "year"}
                        direction={order}
                        onClick={handleSortChange("year")}
                      >
                        Year
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reminder</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedData.map((fee: Fees, index: number) => (
                    <TableRow key={fee?.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{fee?.email}</TableCell>
                      <TableCell>{fee?.month}</TableCell>
                      <TableCell>{fee?.year}</TableCell>
                      <TableCell>
                        {fee?.isPaid && fee.transactionId ? (
                          <Chip
                            label="Paid"
                            color="primary"
                            variant="outlined"
                            size="small"
                          />
                        ) : (
                          <Chip
                            label="Unpaid"
                            color="secondary"
                            variant="outlined"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {!fee.isPaid && (
                          <LoadingButton
                            loading={reminderId === fee.id && reminderLoading}
                            loadingPosition="center"
                            variant="outlined"
                            color="error"
                            onClick={() =>
                              handleReminder(
                                fee.id,
                                fee.email,
                                fee.month,
                                fee.year
                              )
                            }
                          >
                            <AccessAlarmsIcon />
                          </LoadingButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Container>
    </ThemeProvider>
  );
};

export default FeesPage;
