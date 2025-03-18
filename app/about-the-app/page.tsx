'use client'
import {Container, Box} from "@mui/material/";
import PageDetails from "@/app/components/PageDetails";
import {details} from "@/utils/detailsData";
import Hero from "@/app/components/AboutTheApp/Hero";
import Stack from "@/app/components/AboutTheApp/Stack";


const AboutTheAppPage = () => {
    return <Container maxWidth={'xl'} component={'main'}>
        <Hero/>
        <Stack/>
        <Box component={'section'} sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            mb: 4
        }}>

            {
                details.map((p, index) => (
                    <PageDetails
                        key={index}
                        title={p.title}
                        description={p.description}
                        featuredImage={p.featuredImage}
                        list_of_features={p.list_of_features}
                        accessRole={p.accessRole}
                        flexReverse={p.flexReverse}
                    />
                ))
            }
        </Box>


    </Container>
}

export default AboutTheAppPage