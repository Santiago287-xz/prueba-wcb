import {Box, Button, Container, Typography} from "@mui/material";
import Link from "next/link";

const Hero = () => {
    return (
        <Box
            component="section"
            sx={{
                backgroundImage: "url('/hero-background.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                color: "#bebebe",
                textAlign: "center",
                padding: "80px 0",
            }}
        >
            <Container maxWidth="md">
                <Typography variant="h1" component="h1" sx={{
                    marginBottom: 2,
                    fontSize: {
                        xs: "2rem",
                        sm: "3rem",
                        md: "4rem"
                    },
                    padding: "10px",
                    color: "#c0f8e9",
                    backdropFilter: "blur(10px)",
                    borderRadius: "7px"
                }}>
                    Welcome to Our Fitness App
                </Typography>
                <Typography variant="h5" sx={{marginBottom: 4,
                    padding: "10px",
                    color: "#ded7d7",
                    backdropFilter: "blur(5px)",
                    borderRadius: "7px"
                }}>
                    Achieve Your Fitness Goals with Ease
                </Typography>
                <Link href={'/'}>
                    <Button variant="contained" color="primary" size="large">
                        Get Started
                    </Button>
                </Link>
            </Container>
        </Box>
    );
};

export default Hero;
