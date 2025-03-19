"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Loader from "@/app/components/Loader/Loader";
import { useSession, signIn } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import {
  Grid,
  Link,
  Avatar,
  Button,
  CssBaseline,
  TextField,
  Box,
  Typography,
  Container,
} from "@mui/material/";

const defaultTheme = createTheme();

export default function SignInPage() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [testUser, setTestUser] = useState<{
    email: string;
    password: string;
  }>({
    email: "",
    password: "",
  });

  const { status } = useSession();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const router = useRouter();

  useEffect(() => {
    if (testUser.email) {
      setValue("email", testUser.email);
    }
    if (testUser.password) {
      setValue("password", testUser.password);
    }
  }, [testUser, setValue]);

  const handleSignIn: SubmitHandler<FieldValues> = (data) => {
    setIsSubmitting(true);
    signIn("credentials", {
      ...data,
      redirect: false,
    })
      .then((callback) => {
        if (callback?.ok && callback?.error === undefined) {
          toast.success("Logged in successfully!");
          router.refresh();
        }

        if (callback?.error) {
          toast.error(callback.error);
        }
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  if (status === "loading") {
    return <Loader />;
  }

  if (status === "authenticated") {
    return redirect("/");
  }

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="sm">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar sx={{ m: 1, backgroundColor: "secondary.main" }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign in
          </Typography>
          <Box
            component="form"
            noValidate
            onSubmit={handleSubmit(handleSignIn)}
            sx={{ mt: 1 }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              autoComplete="email"
              autoFocus
              {...register("email", {
                required: "This field is required",
              })}
              error={!!errors?.email?.message}
              helperText={
                errors?.email && typeof errors?.email?.message === "string"
                  ? errors?.email?.message
                  : null
              }
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              {...register("password", {
                required: "This field is required",
              })}
              error={!!errors?.password?.message}
              helperText={
                errors?.password &&
                typeof errors?.password?.message === "string"
                  ? errors?.password?.message
                  : null
              }
            />
              <Grid container>
                    <Grid item xs ml={1}>
                        <Link href="/forgot-password" variant="body2">
                            Forgot password?
                        </Link>
                    </Grid>
                </Grid>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
            flexDirection: {
              xs: "column",
              sm: "row",
            },
          }}
        >
          <Button
            onClick={() => {
              setTestUser({
                email: "admin@example.com",
                password: "admin123",
              });
            }}
            size={"small"}
            variant="contained"
          >
            Role as Admin
          </Button>
          <Button
            onClick={() => {
              setTestUser({
                email: "safaballe@gmail.com",
                password: "12345678Aa",
              });
            }}
            size={"small"}
            variant="contained"
          >
            Role as Trainer
          </Button>
          <Button
            onClick={() => {
              setTestUser({
                email: "a@a.com",
                password: "12345678Aa",
              });
            }}
            size={"small"}
            variant="contained"
          >
            Role as User
          </Button>
        </Box>
      
      </Container>
    </ThemeProvider>
  );
}