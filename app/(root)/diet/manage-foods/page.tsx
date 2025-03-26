"use client";

import {
  TableBody,
  createTheme,
  ThemeProvider,
  Container,
  CssBaseline,
  Box,
  Grid,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableSortLabel,
  Paper,
} from "@mui/material";

import { LoadingButton } from "@mui/lab";
import axios from "axios";
import toast from "react-hot-toast";
import { PuffLoader } from "react-spinners";
import { useEffect, useMemo, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import Empty from "@/app/components/Empty";
import { DietFoodList } from "@prisma/client";
import useFoodStore from "@/app/hooks/useFoodStore";

const defaultTheme = createTheme();

const ManageFoodPage: React.FC = () => {
  const { foods, loading, fetchFoods, refetch } = useFoodStore();

  const [deletingId, setDeletingId] = useState<string>("");
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [orderBy, setOrderBy] = useState<keyof DietFoodList>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FieldValues>({
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  const handleSortChange = (property: keyof DietFoodList) => () => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedData = useMemo(() => {
    if (foods && foods.length > 0) {
      return [...foods].sort((a: DietFoodList, b: DietFoodList) => {
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
  }, [foods, orderBy, order]);

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      const res = await axios.post("/api/diet/manage-foods", data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.status === 201) {
        toast.success("Food added successfully!");
        refetch();
        reset();
      }
    } catch (err: Error | any) {
      toast.error(err.response.data.error);
    }
  };

  const deleteFood = async (id: string) => {
    if (!id) {
      return;
    }
    setDeleteLoading(true);
    setDeletingId(id);

    try {
      const res = await axios.delete("/api/diet/manage-foods/", {
        data: {
          id,
        },
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.status === 200) {
        toast.success(res.data.message);
        refetch();
      }
    } catch (error: Error | any) {
      toast.error(error.response.data.error);
    } finally {
      setDeleteLoading(false);
      setDeletingId("");
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="md">
        <CssBaseline />

        <Box
          component="form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            mt: 3,
          }}
        >
          <Grid
            container
            spacing={2}
            sx={{
              mt: 3,
            }}
          >
            <Grid item xs={12}>
              <TextField
                type="text"
                autoComplete="name"
                required
                fullWidth
                id="name"
                label="Food Name"
                autoFocus
                {...register("name", { required: true })}
                helperText={
                  errors.name && typeof errors.name.message === "string"
                    ? errors.name.message
                    : null
                }
                error={errors?.name?.message ? true : false}
              />
            </Grid>
          </Grid>
          <LoadingButton
            type="submit"
            loading={isSubmitting}
            loadingIndicator={<PuffLoader size={20} color="blue" />}
            variant="outlined"
            fullWidth
            sx={{ mt: 3, mb: 2 }}
          >
            Add Food
          </LoadingButton>
        </Box>
        {sortedData.length > 0 ? (
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === "name"}
                      direction={order}
                      onClick={handleSortChange("name")}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "center",
                    }}
                  >
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedData.map((food: DietFoodList, index: number) => (
                  <TableRow key={food.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{food.name}</TableCell>
                    <TableCell>
                      <LoadingButton
                        type="button"
                        loading={deleteLoading && deletingId === food.id}
                        loadingIndicator={<PuffLoader size={20} color="blue" />}
                        variant="contained"
                        color="error"
                        fullWidth
                        onClick={() => deleteFood(food.id)}
                      >
                        Delete
                      </LoadingButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Empty title="No Foods" subtitle="Empty Food List" />
        )}
      </Container>
    </ThemeProvider>
  );
};

export default ManageFoodPage;
