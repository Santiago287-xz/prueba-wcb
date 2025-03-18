'use client'
import {
    Avatar,
    Box,
    CssBaseline,
    TextField,
    ThemeProvider,
    Container,
    createTheme,
    Button,
    Typography
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {useRouter, useSearchParams} from "next/navigation";
import {FieldValues, SubmitHandler, useForm} from "react-hook-form";
import {useState} from "react";
import toast from "react-hot-toast";
import axios from "axios";

const defaultTheme = createTheme();

const PasswordResetPage = () => {
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const router = useRouter()

    const {
        register,
        handleSubmit,
        formState: {errors},
    } = useForm<FieldValues>({
        defaultValues: {
            email: "",
        },
    });

    const handleNewPassword: SubmitHandler<FieldValues> = async (data) => {
        try {
            setIsSubmitting(true);
            const password = data.password;
            const confirmPassword = data.confirmPassword;
            if (!password) {
                toast.error("Please enter your password");
                return;
            }
            if (!confirmPassword) {
                toast.error("Please enter your password again");
                return;
            }
            if (password !== confirmPassword) {
                toast.error("Passwords do not match");
                return;
            }

            const res = await axios.post('/api/auth/reset-password', {password, confirmPassword, token});
            toast.success(res.data.message);
            router.push('/signin')
        } catch (err: Error | any) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ThemeProvider theme={defaultTheme}>
            <Container component="main" maxWidth="lg">
                <CssBaseline/>
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Avatar sx={{m: 1, backgroundColor: 'secondary.main'}}>
                        <LockOutlinedIcon/>
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Choose a new password
                    </Typography>
                </Box>
                <Box component="form" noValidate
                     onSubmit={handleSubmit(handleNewPassword)}
                     sx={{mt: 1}}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="password"
                        label="Password"
                        autoComplete="password"
                        autoFocus
                        {...register("password", {
                            required: "This field is required",
                        })}
                        error={!!errors?.password?.message}
                        helperText={
                            errors?.password && typeof errors?.password?.message === "string"
                                ? errors?.password?.message
                                : null
                        }
                        type={'password'}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="confirmPassword"
                        label="Confirm Password"
                        autoComplete="confirmPassword"
                        autoFocus
                        {...register("confirmPassword", {
                            required: "This field is required",
                        })}
                        error={!!errors?.confirmPassword?.message}
                        helperText={
                            errors?.confirmPassword && typeof errors?.confirmPassword?.message === "string"
                                ? errors?.confirmPassword?.message
                                : null
                        }
                        type={'password'}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{mt: 3, mb: 2}}
                    >
                        {isSubmitting ? "Resetting..." : "Create New Password"}
                    </Button>
                </Box>
            </Container>
        </ThemeProvider>
    );
};

export default PasswordResetPage;