'use client'
import {Avatar, Box, Container, createTheme, CssBaseline, ThemeProvider, Typography} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

const defaultTheme = createTheme();
const ForgotPasswordResetSuccess = () => {
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
                        Check your email
                    </Typography>
                    <Typography component='p' variant='body2' sx={{mt: 1, textAlign: "center"}}>
                        We have sent you an email with a link to reset your password.
                    </Typography>
                </Box>
            </Container>
        </ThemeProvider>
    );
};

export default ForgotPasswordResetSuccess;