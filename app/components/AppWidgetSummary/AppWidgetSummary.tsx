import {styled} from '@mui/material/styles';
import {Card, Typography} from '@mui/material';


interface AppWidgetSummaryProps {
    title: string;
    total: string;
    color: 'primary' | 'info' | 'warning' | 'error'; // Specify the correct types
    icon: React.ReactNode;
}


const StyledIcon = styled('div')(({theme}) => ({
    margin: 'auto',
    display: 'flex',
    borderRadius: '50%',
    alignItems: 'center',
    width: theme.spacing(10),
    height: theme.spacing(10),
    justifyContent: 'center',
    marginBottom: theme.spacing(3),
    border: "1px solid #f1f1f151"
}));


export default function AppWidgetSummary({title, total, color, icon }: AppWidgetSummaryProps) {
    return (
        <Card
            sx={{
                py: 5,
                boxShadow: 0,
                textAlign: 'center',
                color: 'white',
                background: theme => theme.palette[color].main
            }}
        >
            <StyledIcon
                sx={{
                    color: theme => theme.palette[color].contrastText,
                    background: "linear-gradient(135deg, rgba(16, 57, 150, 0) 0%, rgba(16, 57, 150, 0.24) 100%)",
                }}
            >
                {icon}
            </StyledIcon>

            <Typography variant="h3">{total}</Typography>

            <Typography variant="subtitle2" sx={{opacity: 0.72}}>
                {title}
            </Typography>
        </Card>
    );
}