import { Box, Container, Typography, List, ListItem } from "@mui/material";
import Image from "next/image";

const technologies = [
    {
        name: "Next.js",
        image: "/next.png",
    },
    {
        name: "React.js",
        image: "/react.png",
    },
    {
        name: "Material UI",
        image: "/mui.png",
    },
    {
        name: "TypeScript",
        image: "/typescript.png",
    },
    {
        name: "useSWR",
        image: "/swr.png",
    },
    {
        name: "Zustand",
        image: "/zustand.png",
    },
    {
        name: "MongoDB",
        image: "/mongo.png",
    },
    {
        name: "Prisma",
        image: "/prisma.png",
    },
    {
        name: "Stripe",
        image: "/stripe.png",
    },
    {
        name: "Axios",
        image: "/axios.png",
    },
    {
        name: "Next-auth",
        image: "/next-auth.png",
    },
    {
        name: "React-Hot-toast",
        image: "/react-hot-toast.png"
    }

];

const StackSection = () => {
    return (
        <Box
            component="section"
            sx={{
                backgroundColor: "#f8f8f8",
                padding: "50px 0",
                textAlign: "center",
                display: "flex"
            }}
        >
            <Container maxWidth="md">
                <Typography variant="h4" component="h2" sx={{ marginBottom: 4 }}>
                    Our Stack and Technologies
                </Typography>
                <List
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        gap: "10px"
                    }}
                >
                    {technologies.map((tech, index) => (
                        <ListItem
                            key={index}
                            sx={{
                                width: "150px",
                                height: "150px",
                                display: "flex",
                                justifyContent: "center",
                                flexDirection: "column",
                                alignItems: "center",
                            }}
                        >
                            <Image
                                width={50}
                                height={50}
                                layout={'responsive'}
                                src={tech.image}
                                alt={tech.name}
                                style={{ marginBottom: "10px" }}
                            />
                        </ListItem>
                    ))}
                </List>
            </Container>
        </Box>
    );
};

export default StackSection;
