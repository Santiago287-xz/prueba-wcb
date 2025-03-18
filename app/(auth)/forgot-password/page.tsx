'use client'
import {useState} from "react";
import {FieldValues, SubmitHandler, useForm} from "react-hook-form";
import toast from "react-hot-toast";
import {useRouter} from "next/navigation"
import {Avatar, Box, Button, Container, createTheme, CssBaseline, TextField, Typography} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {ThemeProvider} from "@mui/material/styles";
import axios from "axios";
import Error from "next/error";

const defaultTheme = createTheme();

const ForgotPassword = () => {
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const {
        register,
        handleSubmit,
        formState: {errors},
    } = useForm<FieldValues>({
        defaultValues: {
            email: "",
        },
    });




    const router = useRouter();

    const handleForget: SubmitHandler<FieldValues> = async (data) => {
        try {
            setIsSubmitting(true);
            const email = data.email;
            if (!email) {
                toast.error("Please enter your email address");
                return;
            }

            const res = await axios.post('/api/auth/forgot-password', {email});
            router.push('/forgot-password/success');
            toast.success(res.data.message);
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
                        Forgot Password
                    </Typography>
                    <Typography component='p' variant='body2' sx={{mt: 1, textAlign: "center"}}>
                        Enter your email address and we will send you <br/>
                        a link to reset your password.
                    </Typography>
                    <Box component="form" noValidate onSubmit={handleSubmit(handleForget)} sx={{mt: 1}}>
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

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{mt: 3, mb: 2}}
                        >
                            {isSubmitting ? "Resetting..." : "Reset Password"}
                        </Button>
                    </Box>
                </Box>
            </Container>
        </ThemeProvider>
    )
}
export default ForgotPassword;