"use client"
import useSWR from "swr";
import React from "react";
import axios from "axios";
import {User} from "@prisma/client";
import {handleActiveStatus} from "@/utils";
import Loader from "@/app/components/Loader/Loader";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AppWidgetSummary from "@/app/components/AppWidgetSummary/AppWidgetSummary";
import AttendanceGraph from "@/app/components/AdminTrainerDashboard/AttendancesGraph";
import {Box, Select, Typography, Container, MenuItem, Grid, Paper, Divider} from "@mui/material"
import {useRouter} from "next/navigation";


const fetcher = async (...args: Parameters<typeof axios>) => {
    const res = await axios(...args);
    return res.data;
}
const UserDashboard = ({user}: {
    user: User
}) => {
    const {data: fees, isLoading: feesLoading} = useSWR("/api/user/fees", fetcher)
    const {data: attendances, isLoading: attendanceLoading} = useSWR("/api/user/attendance", fetcher)
    const router = useRouter()


    if (feesLoading || attendanceLoading) {
        return <Loader/>
    }

    return <Container maxWidth="xl">
        <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 5
        }}>

            <Typography variant="h4">
                Hi, Welcome back <br/>
                <Box component={'span'}>
                    {user?.name}
                </Box>
            </Typography>
            <Select
                value={user.isActive ? "online" : "offline"}
                onChange={(event) => handleActiveStatus(router, event.target.value)}
                displayEmpty
            >
                <MenuItem value={"online"}>
                    🟢 Online
                </MenuItem>
                <MenuItem value={"offline"}>
                    🔴 Offline
                </MenuItem>
            </Select>
        </Box>

        <Divider sx={{mb: 5, mt: 5}}/>

        <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
                <AppWidgetSummary title="Paid" total={"$" + fees?.paid ? fees?.paid : 0} color={'primary'}
                                  icon={<AttachMoneyIcon/>}/>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
                <AppWidgetSummary title="Unpaid" total={"$" + fees?.unpaid ? fees?.unpaid : 0} color="warning"
                                  icon={<AttachMoneyIcon/>}/>
            </Grid>
        </Grid>

        <Divider sx={{mb: 5, mt: 5}}/>

        <Typography variant="h4">
            Attendance
        </Typography>

        <Grid container sx={{
            mt: 3
        }}>
            <Grid item xs={12}>
                <Paper
                    sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        height: 240,
                        width: '100%'
                    }}
                >
                    <AttendanceGraph attendanceData={attendances.data}/>
                </Paper>
            </Grid>
        </Grid>

    </Container>
}

export default UserDashboard;