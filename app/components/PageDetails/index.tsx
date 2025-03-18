import {Box, Divider, List, ListItem, ListItemIcon} from "@mui/material";
import {Typography} from "@mui/material/";
import Image from "next/image";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface PageDetailsProps {
    title: string;
    description: string;
    featuredImage: string;
    list_of_features: string[];
    accessRole: string[];
    flexReverse?: boolean;
}

const PageDetails = ({
                         title,
                         description,
                         featuredImage,
                         list_of_features,
                         accessRole,
                         flexReverse
                     }: PageDetailsProps) => {
    return (
        <Box
            padding={2}
            sx={{
                minHeight: {
                    xs: "100vh",
                    md: "80vh",
                    lg: "600px",
                },
                display: "flex",
                flexDirection: {
                    xs: flexReverse ? 'column-reverse' : 'column',
                    md: flexReverse ? "row-reverse" : "row"
                },
                background: "rgba(0,0,0, 0.02)",
                transition : "all 0.3s ease-in-out",
                cursor: "pointer",
                "&:hover": {
                    boxShadow: "0 0 20px rgba(0,0,0,0.1)",
                }
            }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    borderRadius: "6px",
                    padding: {
                        xs: 2,
                        sm: 0,

                    },
                }}>
                <Image src={featuredImage} alt={title}
                       width={500} height={500} layout={'responsive'}
                       objectFit={'cover'}
                       objectPosition={'center'}
                       quality={100}
                       priority={true}
                       loading={'eager'}
                       placeholder={'blur'}
                       blurDataURL={featuredImage}
                       style={{
                           borderRadius: "4px",
                           boxShadow: "0 0 20px rgba(0,0,0,0.1)",
                       }}
                />
            </Box>
            <Box
                padding={4}
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "start",
                    justifyContent: "start",
                    flex: 1,
                }}>
                <Typography component={'h1'} sx={{
                    fontSize: {
                        xs: "1.5rem",
                        sm: "2rem",
                    }}}
                >{title}</Typography>
                <Typography variant={'body1'} sx={{
                    my: 3
                }}>{description}</Typography>

                <Divider/>


                <Typography variant={'h6'} sx={{
                    mb: 2
                }}>Access Role : {
                    accessRole.map((role, index) => (
                        <Typography key={index} variant={'body2'} component={'span'} sx={{
                            mx: 1
                        }}>{role}</Typography>
                    ))}
                </Typography>


                <Divider/>
                <List>
                    {list_of_features.map((feature, index) => (
                        <ListItem key={index}>
                            <ListItemIcon>
                                <CheckCircleIcon/>
                            </ListItemIcon>
                            {feature}</ListItem>
                    ))}
                </List>
            </Box>
        </Box>
    );
}

export default PageDetails;