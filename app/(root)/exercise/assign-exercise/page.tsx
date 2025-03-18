"use client";

import { useEffect, useState } from "react";
import {
  ThemeProvider,
  createTheme,
  Container,
  CssBaseline,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Checkbox,
  ListItemText,
  SelectChangeEvent,
  TableCell,
  TableBody,
  TableRow,
  TableHead,
  Table,
  TableContainer,
  Paper,
  TextField,
  Button,
  Typography,
} from "@mui/material";

import useStudentsStore from "@/app/hooks/useStudentsStore";
import Loader from "@/app/components/Loader/Loader";
import { ExerciseList, User } from "@prisma/client";
import useExerciseStore from "@/app/hooks/useExerciseStore";
import useWorkOutStore from "@/app/hooks/useWorkOutStore";
import { LoadingButton } from "@mui/lab";
import { PuffLoader } from "react-spinners";
import toast from "react-hot-toast";
import axios from "axios";
import { CustomizedExercise } from "@/types";

const defaultTheme = createTheme();

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const AssignExercisePage: React.FC = () => {
  const { students, loading, fetchStudents } = useStudentsStore();
  const {
    exercises,
    fetchExercises,
    loading: exerciseLoading,
  } = useExerciseStore();

  const {
    customizedExercises,
    removeCustomizedExercise,
    updateCustomizedExercise,
  } = useWorkOutStore();

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assignLoading, setAssignLoading] = useState<boolean>(false);
  // from date
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString());
  // to date

  const [toDate, setToDate] = useState<string>(new Date().toISOString());

  useEffect(() => {
    fetchStudents();
    fetchExercises();
  }, [fetchStudents, fetchExercises]);

  const workOutArray = Object.values(customizedExercises);

  const handleChange = (event: SelectChangeEvent<typeof selectedStudents>) => {
    const {
      target: { value },
    } = event;

    const selectedArray = Array.isArray(value) ? value : [value];

    setSelectedStudents(selectedArray);
  };

  const assignExercise = async () => {
    setAssignLoading(true);

    if (selectedStudents.length === 0) {
      toast.error("Please select atleast one student");
      return;
    }

    if (workOutArray.length === 0) {
      toast.error("Please add atleast one exercise");
      return;
    }

    if (fromDate === "") {
      toast.error("Please select from date");
      return;
    }

    if (toDate === "") {
      toast.error("Please select to date");
      return;
    }

    try {
      const res = await axios.post(
        "/api/exercise/assign-exercise",
        { selectedStudents, workOutArray, fromDate, toDate },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (res.status === 200) {
        toast.success(res.data.message);
      }
    } catch (err: Error | any) {
      toast.error(err.response.data.error);
    } finally {
      setAssignLoading(false);
      setSelectedStudents([]);
      setFromDate(new Date().toISOString());
      setToDate(new Date().toISOString());
    }
  };

  if (loading || exerciseLoading) {
    return <Loader />;
  }

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="lg">
        <CssBaseline />
        <Box>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Sets</TableCell>
                      <TableCell>Steps</TableCell>
                      <TableCell>Kg</TableCell>
                      <TableCell>Rest Time</TableCell>
                      {/* <TableCell></TableCell> */}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {exercises &&
                      exercises?.map((exercise: ExerciseList) => (
                        <TableRow key={exercise?.id}>
                          <TableCell></TableCell>
                          <TableCell>{exercise?.name}</TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              sx={{ xs: { width: 100 }, sm: { width: "100%" } }}
                              inputProps={{ min: 0 }}
                              id="outlined-basic"
                              label="Set"
                              variant="outlined"
                              value={
                                customizedExercises[exercise?.id]?.sets || 0
                              }
                              onChange={(e) =>
                                updateCustomizedExercise(
                                  exercise?.id,
                                  exercise?.name,
                                  "sets",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              sx={{ xs: { width: 100 }, sm: { width: "100%" } }}
                              inputProps={{ min: 0 }}
                              id="outlined-basic"
                              label="Step"
                              variant="outlined"
                              value={
                                customizedExercises[exercise?.id]?.steps || 0
                              }
                              onChange={(e) =>
                                updateCustomizedExercise(
                                  exercise?.id,
                                  exercise?.name,
                                  "steps",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              sx={{ xs: { width: 100 }, sm: { width: "100%" } }}
                              inputProps={{ min: 0 }}
                              id="outlined-basic"
                              label="Kg"
                              variant="outlined"
                              value={customizedExercises[exercise?.id]?.kg || 0}
                              onChange={(e) =>
                                updateCustomizedExercise(
                                  exercise?.id,
                                  exercise?.name,
                                  "kg",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              sx={{ xs: { width: 100 }, sm: { width: "100%" } }}
                              inputProps={{ min: 0 }}
                              id="outlined-basic"
                              label="Rest Time"
                              variant="outlined"
                              value={
                                customizedExercises[exercise?.id]?.rest || 0
                              }
                              onChange={(e) =>
                                updateCustomizedExercise(
                                  exercise?.id,
                                  exercise?.name,
                                  "rest",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="demo-multiple-checkbox-label">
                  Students
                </InputLabel>
                <Select
                  labelId="demo-multiple-checkbox-label"
                  id="demo-multiple-checkbox"
                  multiple
                  value={selectedStudents}
                  onChange={handleChange}
                  input={<OutlinedInput label="Students" />}
                  renderValue={(selected) =>
                    selected
                      .map(
                        (studentId) =>
                          students.find((student) => student.id === studentId)
                            ?.name
                      )
                      .join(", ")
                  }
                  MenuProps={MenuProps}
                >
                  {students.map((student: User) => (
                    <MenuItem key={student.id} value={student.id}>
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                      />
                      <ListItemText primary={student.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {workOutArray.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h2">Result</Typography>
            <Grid container>
              <Grid item xs={12}>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Sets</TableCell>
                        <TableCell>Steps</TableCell>
                        <TableCell>Kg</TableCell>
                        <TableCell>Rest Time</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {workOutArray.map((exercise: CustomizedExercise) => (
                        <TableRow key={exercise?.id}>
                          <TableCell>{exercise?.exerciseName}</TableCell>
                          <TableCell>{exercise?.sets}</TableCell>
                          <TableCell>{exercise?.steps}</TableCell>
                          <TableCell>{exercise?.kg}</TableCell>
                          <TableCell>{exercise?.rest}</TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              onClick={() =>
                                removeCustomizedExercise(exercise?.id)
                              }
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <TextField
                      type="date"
                      variant="outlined"
                      fullWidth
                      value={fromDate ? fromDate.split("T")[0] : ""}
                      onChange={(e) =>
                        e.target.value
                          ? setFromDate(new Date(e.target.value).toISOString())
                          : setFromDate(new Date().toISOString())
                      }
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <TextField
                      type="date"
                      variant="outlined"
                      fullWidth
                      value={toDate ? toDate.split("T")[0] : ""}
                      onChange={(e) =>
                        e.target.value
                          ? setToDate(new Date(e.target.value).toISOString())
                          : setToDate(new Date().toISOString())
                      }
                    />
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            <LoadingButton
              type="button"
              disabled={
                assignLoading ||
                !selectedStudents.length ||
                !fromDate ||
                !toDate ||
                !workOutArray.length
              }
              loading={assignLoading}
              loadingIndicator={<PuffLoader size={20} color="blue" />}
              variant="contained"
              color="error"
              fullWidth
              onClick={assignExercise}
              sx={{
                mt: 3,
              }}
            >
              Assign Exercise
            </LoadingButton>
          </Box>
        )}
      </Container>
    </ThemeProvider>
  );
};

export default AssignExercisePage;
