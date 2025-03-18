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
import useFoodStore from "@/app/hooks/useFoodStore";

import { DietFoodList, User } from "@prisma/client";

import { LoadingButton } from "@mui/lab";
import { PuffLoader } from "react-spinners";
import toast from "react-hot-toast";
import axios from "axios";
import Loader from "@/app/components/Loader/Loader";
import useDietStore from "@/app/hooks/useDietStore";
import { DietFood } from "@/types";

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

const defaultTheme = createTheme();

const AssignDiet: React.FC = () => {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [assignLoading, setAssignLoading] = useState<boolean>(false);
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString());
  const [toDate, setToDate] = useState<string>(new Date().toISOString());

  const { students, loading, fetchStudents } = useStudentsStore();
  const { foods, fetchFoods, loading: foodLoading } = useFoodStore();
  const { dietFoods, removeDietFood, updateDietFood } = useDietStore();

  useEffect(() => {
    fetchStudents();
    fetchFoods();
  }, [fetchStudents, fetchFoods]);

  const dietFoodsArray = Object.values(dietFoods);

  const handleChange = (event: SelectChangeEvent<typeof selectedStudents>) => {
    const {
      target: { value },
    } = event;

    const selectedArray = Array.isArray(value) ? value : [value];

    setSelectedStudents(selectedArray);
  };

  const assignDiet = async () => {
    setAssignLoading(true);

    if (selectedStudents.length === 0) {
      toast.error("Please select atleast one student");
      return;
    }

    if (dietFoodsArray.length === 0) {
      toast.error("Please add atleast one diet");
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
        "/api/diet/assign-diet",
        {
          selectedStudents,
          dietFoodsArray,
          fromDate,
          toDate,
        },
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

  if (loading || foodLoading) {
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
                    <TableRow sx={{ textAlign: "center" }}>
                      <TableCell></TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>B.F.</TableCell>
                      <TableCell>M.M.</TableCell>
                      <TableCell>L</TableCell>
                      <TableCell>E.S.</TableCell>
                      <TableCell>D</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {foods &&
                      foods.map((food: DietFoodList, index: number) => (
                        <TableRow key={food.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{food.name}</TableCell>
                          <TableCell>
                            <Checkbox
                              checked={dietFoods[food.id]?.breakfast || false}
                              onChange={(e) =>
                                updateDietFood(
                                  food.id,
                                  food.name,
                                  "breakfast",
                                  e.target.checked
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={dietFoods[food.id]?.morningMeal || false}
                              onChange={(e) =>
                                updateDietFood(
                                  food.id,
                                  food.name,
                                  "morningMeal",
                                  e.target.checked
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={dietFoods[food.id]?.lunch || false}
                              onChange={(e) =>
                                updateDietFood(
                                  food.id,
                                  food.name,
                                  "lunch",
                                  e.target.checked
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={
                                dietFoods[food.id]?.eveningSnack || false
                              }
                              onChange={(e) =>
                                updateDietFood(
                                  food.id,
                                  food.name,
                                  "eveningSnack",
                                  e.target.checked
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={dietFoods[food.id]?.dinner || false}
                              onChange={(e) =>
                                updateDietFood(
                                  food.id,
                                  food.name,
                                  "dinner",
                                  e.target.checked
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
        {dietFoodsArray.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h2">Result</Typography>
            <Grid container>
              <Grid item xs={12}>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ textAlign: "center" }}>
                        <TableCell>Name</TableCell>
                        <TableCell>B.F.</TableCell>
                        <TableCell>M.M.</TableCell>
                        <TableCell>L</TableCell>
                        <TableCell>E.S.</TableCell>
                        <TableCell>D</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dietFoodsArray.map((food: DietFood) => (
                        <TableRow key={food?.id}>
                          <TableCell>{food?.dietFoodName}</TableCell>
                          <TableCell>
                            <Checkbox checked={food?.breakfast || false} />
                          </TableCell>
                          <TableCell>
                            <Checkbox checked={food?.morningMeal || false} />
                          </TableCell>
                          <TableCell>
                            <Checkbox checked={food?.lunch || false} />
                          </TableCell>
                          <TableCell>
                            {" "}
                            <Checkbox checked={food?.eveningSnack || false} />
                          </TableCell>
                          <TableCell>
                            {" "}
                            <Checkbox checked={food?.dinner || false} />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              onClick={() => removeDietFood(food?.id)}
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
                !dietFoodsArray.length
              }
              loading={assignLoading}
              loadingIndicator={<PuffLoader size={20} color="blue" />}
              variant="contained"
              color="error"
              fullWidth
              onClick={assignDiet}
              sx={{
                mt: 3,
              }}
            >
              Assign Diet
            </LoadingButton>
          </Box>
        )}
      </Container>
    </ThemeProvider>
  );
};

export default AssignDiet;
