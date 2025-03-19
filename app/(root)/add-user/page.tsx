"use client";

import axios from "axios";
import Error from "next/error";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Grid from "@mui/material/Grid";
import { LoadingButton } from "@mui/lab";
import Container from "@mui/material/Container";
import TextField from "@mui/material/TextField";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Box, CssBaseline, MenuItem, Select } from "@mui/material/";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { SessionUser } from "@/types";

const defaultTheme = createTheme();

const AddMemberPage: React.FC = () => {
  const { data } = useSession();
  const sessionUser = data?.user as SessionUser;
  const router = useRouter();
  const {
    register,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FieldValues & { age: number; weight: number; height: number; phone: number }>({
    defaultValues: {
      role: "",
      name: "",
      email: "",
      password: "",
      age: 18,
      weight: 50,
      height: 100,
      gender: "",
      goal: "",
      level: "",
      phone: 0,
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      const res = await axios.post("/api/users", data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.data.status === 201) {
        toast.success("User Created Successfully");
        reset();
        router.push("trainers");
      }
    } catch (err: Error | any) {
      toast.error(err.response.data.error);
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />

        <Box
          component="form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          sx={{ mt: 3 }}
        >
          <Grid
            container
            spacing={2}
            sx={{
              mt: 3,
            }}
          >
            <Grid item xs={12} sm={6}>
              <TextField
                type="text"
                autoComplete="name"
                required
                fullWidth
                id="name"
                label="Name"
                autoFocus
                {...register("name", { required: true })}
                helperText={
                  errors.name && typeof errors.name.message === "string"
                    ? errors.name.message
                    : null
                }
                error={!!errors?.name?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Select
                fullWidth
                autoFocus
                required
                defaultValue={"user"}
                {...register("role", {
                  required: true,
                })}
                displayEmpty
              >
                {sessionUser?.role === "admin" && (
                  <MenuItem value="trainer">Trainer</MenuItem>
                )}
                <MenuItem value="user">Student</MenuItem>
              </Select>
            </Grid>

            <Grid item xs={12}>
              <TextField
                type="email"
                autoComplete="email"
                required
                fullWidth
                id="email"
                label="Email Address"
                autoFocus
                error={!!errors?.email?.message}
                helperText={
                  errors.email && typeof errors.email.message === "string"
                    ? errors.email.message
                    : null
                }
                {...register("email", {
                  required: true,
                  pattern: {
                    value: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/,
                    message: "Invalid email address",
                  },
                })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                type="number"
                autoComplete="tel"
                required
                fullWidth
                id="phone"
                label="Phone Number"
                autoFocus
                error={!!errors?.phone?.message}
                helperText={
                  errors.phone && typeof errors.phone.message === "string"
                    ? errors.phone.message
                    : null
                }
                {...register("phone", {
                  required: true,
                  pattern: {
                    value: /^[0-9]+$/,
                    message: "Phone must be a number",
                  },
                  setValueAs: (value) => parseInt(value),
                })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                type="password"
                required
                fullWidth
                id="password"
                label="Enter Password"
                autoFocus
                error={!!errors?.password?.message}
                helperText={
                  errors.password && typeof errors.password.message === "string"
                    ? errors.password.message
                    : null
                }
                {...register("password", {
                  required: true,
                  minLength: {
                    value: 8,
                    message: "Password must have at least 8 characters",
                  },
                  maxLength: {
                    value: 20,
                    message: "Password must have at most 20 characters",
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,20}$/,
                    message:
                      "Password must contain at least one uppercase letter, one lowercase letter and one number",
                  },
                })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                autoComplete="age"
                required
                fullWidth
                min={0}
                id="age"
                label="Age"
                autoFocus
                {...register("age", {
                  required: true,
                  min: {
                    value: 0,
                    message: "Age must be greater than 0",
                  },
                  pattern: {
                    value: /^[0-9]+$/,
                    message: "Age must be a number",
                  },
                  setValueAs: (value) => parseInt(value),
                })}
                helperText={
                  errors.age && typeof errors.age.message === "string"
                    ? errors.age.message
                    : null
                }
                error={!!errors?.age?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                autoComplete="weight"
                required
                fullWidth
                id="weight"
                label="Weight(k.g.)"
                autoFocus
                {...register("weight", {
                  required: true,
                  min: {
                    value: 0,
                    message: "Weight must be greater than 0",
                  },
                  pattern: {
                    value: /^[0-9]+$/,
                    message: "Weight must be a number",
                  },
                  setValueAs: (value) => parseInt(value),
                })}
                helperText={
                  errors.weight && typeof errors.weight.message === "string"
                    ? errors.weight.message
                    : null
                }
                error={!!errors?.weight?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                type="number"
                autoComplete="height"
                required
                fullWidth
                min={0}
                id="height"
                label="Height(c.m)"
                autoFocus
                {...register("height", {
                  required: true,
                  min: {
                    value: 0,
                    message: "Height must be greater than 0",
                  },
                  pattern: {
                    value: /^[0-9]+$/,
                    message: "Height must be a number",
                  },
                  setValueAs: (value) => parseInt(value),
                })}
                helperText={
                  errors.height && typeof errors.height.message === "string"
                    ? errors.height.message
                    : null
                }
                error={!!errors?.height?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Select
                fullWidth
                autoFocus
                required
                defaultValue={"male"}
                {...register("gender", {
                  required: true,
                })}
                displayEmpty
              >
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Select
                fullWidth
                autoFocus
                required
                defaultValue={"gain_weight"}
                {...register("goal", {
                  required: true,
                })}
                displayEmpty
              >
                <MenuItem value="gain_weight">Gain Weight</MenuItem>
                <MenuItem value="lose_weight">Lose Weight</MenuItem>
                <MenuItem value="get_fitter">Get Fitter</MenuItem>
                <MenuItem value="get_stronger">Get Stronger</MenuItem>
                <MenuItem value="get_healthier">Get Healthier</MenuItem>
                <MenuItem value="get_more_flexible">Get More Flexible</MenuItem>
                <MenuItem value="get_more_muscular">Get More Muscular</MenuItem>
                <MenuItem value="learn_the_basics">Learn The Basics</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12}>
              <Select
                fullWidth
                autoFocus
                required
                defaultValue={"beginner"}
                {...register("level", {
                  required: true,
                })}
                displayEmpty
              >
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
                <MenuItem value="expert">Expert</MenuItem>
                <MenuItem value="professional">Professional</MenuItem>
              </Select>
            </Grid>
          </Grid>
          <LoadingButton
            type="submit"
            loading={isSubmitting}
            loadingIndicator="Adding Member"
            variant="outlined"
            fullWidth
            sx={{ mt: 3, mb: 2 }}
          >
            Add Member
          </LoadingButton>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default AddMemberPage;