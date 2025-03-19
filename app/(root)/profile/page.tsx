"use client";

import {
    Container,
    Grid,
    ThemeProvider,
    createTheme,
    TableCell,
    TableBody,
    TableRow,
    Table,
    TableContainer,
    Paper, Box, MenuItem, Select
} from "@mui/material";
import axios from "axios";
import useSWR from "swr";
import Loader from "@/app/components/Loader/Loader"
import Empty from "@/app/components/Empty"
import {FieldValues, SubmitHandler, useForm} from "react-hook-form";
import {TextField} from "@mui/material/";
import {LoadingButton} from "@mui/lab";
import {useState, useEffect} from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";

const defaultTheme = createTheme();

const fetcher = async (...args: Parameters<typeof axios>) => {
    const res = await axios(...args);
    return res.data
}
export default function ProfilePage() {
    const {update, data: session, status} = useSession()
    const {data, isLoading, error, mutate} = useSWR('/api/user/profile', fetcher);
    const [passwordsMatch, setPasswordsMatch] = useState<boolean>(true);

    const user = data?.data;
    
    // Verificar si el email es de Gmail
    const isGmailAccount = user?.email ? user.email.endsWith('@gmail.com') : false;
    
    useEffect(() => {
        if (user?.email && !isGmailAccount) {
            toast.error("Solo se permiten cuentas de Gmail");
        }
    }, [user?.email, isGmailAccount]);

    const {
        register,
        setValue,
        getValues,
        handleSubmit,
        reset,
        formState: {errors, isSubmitting},
    } = useForm<FieldValues & { age: number; weight: number; height: number; phone: number }>({
        defaultValues: {
            name: user?.name,
            role: user?.role,
            gender: user?.gender,
            age: user?.age ?? 18,
            weight: user?.weight ?? 50,
            height: user?.height ?? 150,
            phone: user?.phone ?? 0,
            goal: user?.goal ?? "",
            level: user?.level ?? "",
            password: "",
            confirmPassword: ""
        },
        mode: "onChange"
    });

    const onSubmit: SubmitHandler<FieldValues> = async (data) => {
        try {
            // Verificar si el email es de Gmail
            if (user?.email && !user.email.endsWith('@gmail.com')) {
                toast.error("Solo se permiten cuentas de Gmail");
                return;
            }
            
            const res = await axios.patch('/api/users', data, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if(res.status === 200) {
                toast.success(res.data.message)
                await mutate('/api/user/profile');
                await update({
                   ...session,
                    user: {
                        ...session?.user,
                    }
                })
                reset();
            }

        } catch (err: Error | any) {
            console.log(err)
            toast.error(err.response?.data?.error || "An error occurred during update");
        }
    }


    if (error) {
        return <Empty title={'Error'} subtitle={"Something went wrong."}/>
    }

    if (isLoading || status === 'loading') {
        return <Loader/>
    }


    return (
        <ThemeProvider theme={defaultTheme}>
            <Container component="main" maxWidth="md">
                <Box component={'form'} noValidate
                     onSubmit={handleSubmit(onSubmit)}
                     sx={{mt: 3}}
                >
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={12} sx={{
                            mt: {xs: 3, md: 0}
                        }}>
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableBody>
                                        {user?.name && <TableRow sx={{textAlign: "center"}}>
                                            <TableCell>Name</TableCell>
                                            <TableCell>
                                                <TextField
                                                    size={"small"}
                                                    fullWidth
                                                    id="name"
                                                    autoComplete="name"
                                                    defaultValue={user?.name}
                                                    autoFocus
                                                    {...register("name", {
                                                        required: "This field is required",
                                                    })}
                                                    error={!!errors?.name?.message}
                                                    helperText={
                                                        errors?.name && typeof errors?.name?.message === "string"
                                                            ? errors?.name?.message
                                                            : null
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>}
                                        {user?.email && <TableRow sx={{textAlign: "center"}}>
                                            <TableCell>Email</TableCell>
                                            <TableCell>{user?.email}</TableCell>
                                        </TableRow>}
                                        <TableRow sx={{textAlign: "center"}}>
                                            <TableCell>Phone</TableCell>
                                            <TableCell>
                                                <TextField
                                                    size={"small"}
                                                    fullWidth
                                                    defaultValue={user?.phone && user?.phone !== 0 ? user?.phone : ""}
                                                    placeholder="Ingresar teléfono"
                                                    type="number"
                                                    id="phone"
                                                    autoComplete="tel"
                                                    autoFocus
                                                    inputProps={{ 
                                                        maxLength: 15,
                                                        pattern: "[0-9]*"
                                                    }}
                                                    {...register("phone", {
                                                        pattern: {
                                                            value: /^[0-9]+$/,
                                                            message: "El teléfono debe ser un número",
                                                        },
                                                        maxLength: {
                                                            value: 15,
                                                            message: "Número de teléfono demasiado largo"
                                                        },
                                                        setValueAs: (value) => value === "" ? 0 : parseInt(value),
                                                    })}
                                                    error={!!errors?.phone?.message}
                                                    helperText={
                                                        errors?.phone && typeof errors?.phone?.message === "string"
                                                            ? errors?.phone?.message
                                                            : null
                                                    }
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value.length > 15) {
                                                            e.target.value = value.slice(0, 15);
                                                        }
                                                        setValue("phone", e.target.value, { shouldValidate: true });
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                        {user?.role && <TableRow sx={{textAlign: "center"}}>
                                            <TableCell>Role</TableCell>
                                            <TableCell>
                                                <Select
                                                    size={'small'}
                                                    fullWidth
                                                    autoFocus
                                                    defaultValue={user?.role}
                                                    {...register("role")}
                                                    displayEmpty
                                                >
                                                    <MenuItem value="user">Student</MenuItem>
                                                    <MenuItem value="trainer">Trainer</MenuItem>
                                                    <MenuItem value="admin">Admin</MenuItem>
                                                </Select>
                                            </TableCell>
                                        </TableRow>}
                                        {user?.gender && <TableRow sx={{textAlign: "center"}}>
                                            <TableCell>Gender</TableCell>
                                            <TableCell>
                                                <Select
                                                    size={'small'}
                                                    fullWidth
                                                    autoFocus
                                                    defaultValue={user?.gender ?? "male"}
                                                    {...register("gender")}
                                                    displayEmpty
                                                >
                                                    <MenuItem value="male">Male</MenuItem>
                                                    <MenuItem value="female">Female</MenuItem>
                                                </Select>
                                            </TableCell>
                                        </TableRow>}

                                        <TableRow>
                                            <TableCell>Age</TableCell>
                                            <TableCell>
                                                <TextField
                                                    size={"small"}
                                                    defaultValue={user?.age ?? 18}
                                                    type="number"
                                                    autoComplete="age"
                                                    fullWidth
                                                    id="age"
                                                    autoFocus
                                                    inputProps={{ 
                                                        min: 12,
                                                        max: 120
                                                    }}
                                                    {...register("age", {
                                                        min: {
                                                            value: 12,
                                                            message: "La edad debe ser mayor a 12 años",
                                                        },
                                                        max: {
                                                            value: 120,
                                                            message: "La edad debe ser menor a 120 años",
                                                        },
                                                        pattern: {
                                                            value: /^[0-9]+$/,
                                                            message: "La edad debe ser un número",
                                                        },
                                                        setValueAs: (value) => parseInt(value),
                                                    })}
                                                    helperText={
                                                        errors?.age && typeof errors?.age?.message === "string"
                                                            ? errors?.age?.message
                                                            : null
                                                    }
                                                    error={!!errors?.age?.message}
                                                    onChange={(e) => {
                                                        setValue("age", e.target.value, { shouldValidate: true });
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>

                                        <TableRow>
                                            <TableCell>Weight(k.g.)</TableCell>
                                            <TableCell>
                                                <TextField
                                                    size={"small"}
                                                    defaultValue={user?.weight ?? 50}
                                                    type="number"
                                                    autoComplete="weight"
                                                    fullWidth
                                                    id="weight"
                                                    autoFocus
                                                    inputProps={{ 
                                                        min: 0,
                                                        max: 400
                                                    }}
                                                    {...register("weight", {
                                                        min: {
                                                            value: 0,
                                                            message: "El peso debe ser mayor que 0",
                                                        },
                                                        max: {
                                                            value: 400,
                                                            message: "El peso no puede superar los 400 kg",
                                                        },
                                                        pattern: {
                                                            value: /^[0-9]+$/,
                                                            message: "El peso debe ser un número",
                                                        },
                                                        setValueAs: (value) => parseInt(value),
                                                    })}
                                                    helperText={
                                                        errors?.weight && typeof errors?.weight?.message === "string"
                                                            ? errors?.weight?.message
                                                            : null
                                                    }
                                                    error={!!errors?.weight?.message}
                                                    onChange={(e) => {
                                                        setValue("weight", e.target.value, { shouldValidate: true });
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>

                                        <TableRow>
                                            <TableCell>Height(c.m)</TableCell>
                                            <TableCell>
                                                <TextField
                                                    size={"small"}
                                                    defaultValue={user?.height ?? 150}
                                                    type="number"
                                                    autoComplete="height"
                                                    fullWidth
                                                    id="height"
                                                    autoFocus
                                                    inputProps={{ 
                                                        min: 0,
                                                        max: 250
                                                    }}
                                                    {...register("height", {
                                                        min: {
                                                            value: 0,
                                                            message: "La altura debe ser mayor que 0",
                                                        },
                                                        max: {
                                                            value: 250,
                                                            message: "La altura no puede superar los 2.5m (250 cm)",
                                                        },
                                                        pattern: {
                                                            value: /^[0-9]+$/,
                                                            message: "La altura debe ser un número",
                                                        },
                                                        setValueAs: (value) => parseInt(value),
                                                    })}
                                                    helperText={
                                                        errors?.height && typeof errors?.height?.message === "string"
                                                            ? errors?.height?.message
                                                            : null
                                                    }
                                                    error={!!errors?.height?.message}
                                                    onChange={(e) => {
                                                        setValue("height", e.target.value, { shouldValidate: true });
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>


                                        {user?.goal && <TableRow sx={{textAlign: "center"}}>
                                            <TableCell>Goal</TableCell>
                                            <TableCell sx={{
                                                textTransform: "capitalize"
                                            }}>
                                                <Select
                                                    size={'small'}
                                                    fullWidth
                                                    autoFocus
                                                    defaultValue={user?.goal ?? 'gain_weight'}
                                                    {...register("goal")}
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
                                            </TableCell>
                                        </TableRow>}
                                        {user?.level && <TableRow sx={{textAlign: "center"}}>
                                            <TableCell>Level</TableCell>
                                            <TableCell sx={{
                                                textTransform: "capitalize"
                                            }}>
                                                <Select
                                                    size={'small'}
                                                    fullWidth
                                                    autoFocus
                                                    defaultValue={user?.level ?? "beginner"}
                                                    {...register("level")}
                                                    displayEmpty
                                                >
                                                    <MenuItem value="beginner">Beginner</MenuItem>
                                                    <MenuItem value="intermediate">Intermediate</MenuItem>
                                                    <MenuItem value="advanced">Advanced</MenuItem>
                                                    <MenuItem value="expert">Expert</MenuItem>
                                                    <MenuItem value="professional">Professional</MenuItem>
                                                </Select>
                                            </TableCell>
                                        </TableRow>}
                                        <TableRow>
                                            <TableCell>
                                                Password
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    size={'small'}
                                                    type="password"
                                                    fullWidth
                                                    id="password"
                                                    placeholder="Enter new password"
                                                    autoFocus
                                                    error={!!errors?.password?.message}
                                                    helperText={
                                                        errors?.password && typeof errors?.password?.message === "string"
                                                            ? errors?.password?.message
                                                            : null
                                                    }
                                                    {...register("password", {
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
                                                    onChange={(e) => {
                                                        setValue("password", e.target.value);
                                                        if (getValues("confirmPassword") === e.target.value) {
                                                            setPasswordsMatch(true);
                                                        } else {
                                                            setPasswordsMatch(false);
                                                        }
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>
                                                Confirm Password
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    size={'small'}
                                                    type="password"
                                                    fullWidth
                                                    id="confirm-password"
                                                    placeholder="Re-enter password"
                                                    autoFocus
                                                    error={!!errors?.confirmPassword?.message || !passwordsMatch}
                                                    helperText={
                                                        !passwordsMatch
                                                            ? "Passwords do not match"
                                                            : (errors?.confirmPassword && typeof errors?.confirmPassword?.message === "string"
                                                                ? errors?.confirmPassword?.message
                                                                : null)
                                                    }
                                                    {...register("confirmPassword", {
                                                        validate: (value) =>
                                                            value === getValues("password") || "Passwords do not match",
                                                    })}
                                                    onChange={(e) => {
                                                        setValue("confirmPassword", e.target.value);
                                                        if (getValues("password") === e.target.value) {
                                                            setPasswordsMatch(true);
                                                        } else {
                                                            setPasswordsMatch(false);
                                                        }
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <LoadingButton
                                type="submit"
                                loading={isSubmitting}
                                loadingIndicator="Saving Update"
                                variant="outlined"
                                fullWidth
                                sx={{mt: 3, mb: 2}}
                            >
                                Save
                            </LoadingButton>
                        </Grid>
                    </Grid>
                </Box>
            </Container>
        </ThemeProvider>
    );
}