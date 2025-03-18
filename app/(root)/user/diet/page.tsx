"use client";

import Empty from "@/app/components/Empty";
import { CustomizedExercise, DietFood } from "@/types";
import {
  Box,
  Checkbox,
  Container,
  CssBaseline,
  Grid,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import axios from "axios";
import useSWR from "swr";

const defaultTheme = createTheme();

const fetcher = async (...args: Parameters<typeof axios>) => {
  const res = await axios(...args);
  return res.data.data;
};

const MyDietPage = () => {
  const { data, isLoading, error } = useSWR("/api/user/diet", fetcher);

  if (error) {
    return (
      <Empty
        title={error.response.data.title || "Error"}
        subtitle={error.response.data.subTitle || "Something went wrong"}
      />
    );
  }

  if (isLoading) {
    return (
      <ThemeProvider theme={defaultTheme}>
        <Container component="main" maxWidth="lg">
          <CssBaseline />
          <Box>
            <Skeleton
              animation="wave"
              variant="text"
              sx={{ fontSize: "3rem" }}
            />
          </Box>
          <Box
            sx={{
              my: 3,
            }}
          >
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box
                  p={2}
                  sx={{
                    border: "1px solid #333",
                    borderRadius: "7px",
                  }}
                >
                  <Typography component="h2" variant="h4">
                    <Skeleton
                      animation="wave"
                      variant="text"
                      sx={{ fontSize: "2rem" }}
                    />
                  </Typography>
                  <Typography component="h2" variant="h6">
                    <Skeleton
                      animation="wave"
                      variant="text"
                      sx={{ fontSize: "2rem" }}
                    />
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box
                  p={2}
                  sx={{
                    border: "1px solid #333",
                    borderRadius: "7px",
                  }}
                >
                  <Typography component="h2" variant="h4">
                    <Skeleton
                      animation="wave"
                      variant="text"
                      sx={{ fontSize: "2rem" }}
                    />
                  </Typography>
                  <Typography component="h2" variant="h6">
                    <Skeleton
                      animation="wave"
                      variant="text"
                      sx={{ fontSize: "2rem" }}
                    />
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
          <Box>
            <Skeleton
              animation="wave"
              variant="rounded"
              sx={{
                width: "100%",
                height: {
                  xs: 200,
                  sm: 300,
                },
              }}
            />
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="lg">
        <CssBaseline />
        <Box>
          <Typography component="h1" variant="h2">
            My Diet Sheet
          </Typography>
        </Box>
        <Box
          sx={{
            my: 3,
          }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Box
                p={2}
                sx={{
                  border: "1px solid #333",
                  borderRadius: "7px",
                }}
              >
                <Typography component="h2" variant="h4">
                  From
                </Typography>
                <Typography component="h2" variant="h6">
                  {new Date(data?.fromDate).toISOString().slice(0, 10)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box
                p={2}
                sx={{
                  border: "1px solid #333",
                  borderRadius: "7px",
                }}
              >
                <Typography component="h2" variant="h4">
                  To
                </Typography>
                <Typography component="h2" variant="h6">
                  {new Date(data?.toDate).toISOString().slice(0, 10)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
        <Box>
          <Grid container>
            <Grid item xs={12}>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>B.F.</TableCell>
                      <TableCell>M.M.</TableCell>
                      <TableCell>L</TableCell>
                      <TableCell>E.S.</TableCell>
                      <TableCell>D</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody
                    sx={{
                      textAlign: "center",
                    }}
                  >
                    {data.periodWithFoodList.length > 0 &&
                      data?.periodWithFoodList?.map((food: DietFood) => (
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
                            <Checkbox checked={food?.eveningSnack || false} />
                          </TableCell>
                          <TableCell>
                            <Checkbox checked={food?.dinner || false} />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default MyDietPage;
