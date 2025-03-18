"use client";

import {
    Button,
    Container,
    Grid,
    ThemeProvider,
    createTheme,
    TableBody,
    TableCell,
    TableRow,
    Table,
    TableContainer,
    Paper, Skeleton,
} from "@mui/material";
import {User} from "@prisma/client";
import Image from "next/image";
import {useRouter} from "next/navigation";

const defaultTheme = createTheme();
export default function UserClient({user}: { user: User }) {
    const router = useRouter();
    return (
        <ThemeProvider theme={defaultTheme}>
            <Container component="main" maxWidth="md">
                <Grid container spacing={4}>
                    <Grid item xs={12} md={6}>
                        {!user.image? <Skeleton
                                animation="wave"
                                variant="rounded"
                                sx={{
                                    width: "100%",
                                    height: {
                                        xs: 200,
                                        sm: 300,
                                    },
                                }}
                            /> :
                            /* Use Next.js Image component */
                            <Image
                                src={user?.image || ""}
                                alt={user.name}
                                layout="responsive" // Make the image responsive
                                width={400}
                                height={300}
                                loading="lazy"
                                style={{
                                    borderRadius: "13px",
                                    width: "100%",
                                }}
                            />}
                    </Grid>
                    <Grid item xs={12} md={6} sx={{
                        mt: {xs: 3, md: 0}
                    }}>
                        <TableContainer component={Paper}>
                            <Table>
                                <TableBody>

                                    {user.name && <TableRow sx={{textAlign: "center"}}>
                                        <TableCell>Name</TableCell>
                                        <TableCell>{user.name}</TableCell>
                                    </TableRow>}
                                    {user.email && <TableRow sx={{textAlign: "center"}}>
                                        <TableCell>Email</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                    </TableRow>}
                                    {user.role && <TableRow sx={{textAlign: "center"}}>
                                        <TableCell>Role</TableCell>
                                        <TableCell>{user.role}</TableCell>
                                    </TableRow>}
                                    {user.gender && <TableRow sx={{textAlign: "center"}}>
                                        <TableCell>Gender</TableCell>
                                        <TableCell>{user?.gender}</TableCell>
                                    </TableRow>}


                                    {user.role === "user" && <>

                                        <TableRow>
                                            <TableCell>Age</TableCell>
                                            <TableCell>{user?.age} years</TableCell>
                                        </TableRow>

                                        <TableRow>
                                            <TableCell>Weight</TableCell>
                                            <TableCell>{user?.weight} kg</TableCell>
                                        </TableRow>

                                        <TableRow>
                                            <TableCell>Age</TableCell>
                                            <TableCell>{user?.height} cm</TableCell>
                                        </TableRow>


                                        {user.goal && <TableRow sx={{textAlign: "center"}}>
                                            <TableCell>Goal</TableCell>
                                            <TableCell sx={{
                                                textTransform: "capitalize"
                                            }}>{user.goal.split("_").join(" ")}</TableCell>
                                        </TableRow>}
                                        {user.level && <TableRow sx={{textAlign: "center"}}>
                                            <TableCell>Level</TableCell>
                                            <TableCell sx={{
                                                textTransform: "capitalize"
                                            }}>{user.level}</TableCell>
                                        </TableRow>}
                                    </>}

                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>
                </Grid>
                <Button
                    variant="contained"
                    color="success"
                    onClick={() => router.back()}
                    sx={{
                        mt: 3
                    }}
                >
                    Go Back
                </Button>
            </Container>
        </ThemeProvider>
    );
}
