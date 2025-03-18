"use client";

import useSWR from "swr";
import axios from "axios";
import {useState} from "react";
import {LoadingButton} from "@mui/lab";
import {useRouter} from "next/navigation";
import Empty from "@/app/components/Empty";
import {User, Notification} from "@prisma/client";
import Loader from "@/app/components/Loader/Loader";
import {Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box} from "@mui/material";


const fetcher = async (...args: Parameters <typeof axios>) => {
    const res = await axios(...args);
    return res.data
}
export default function NotificationsPage() {
    const {data, isLoading, error, mutate} = useSWR("/api/notification", fetcher, {
        revalidateOnFocus: false,
    })
    const router = useRouter()
    const [notifyId, setNotifyId] = useState<string>("")
    const [notifyLoading, setNotifyLoading] = useState<boolean>(false)

    const handleRead = async (notificationId: string) => {
        try {
            setNotifyId(notificationId);
            setNotifyLoading(true)
            const res = await axios.patch(`/api/notification/${notificationId}`);

            if (res.status === 201) {
                await mutate("/api/notification")
            }
        } catch (error) {
        } finally {
            setNotifyId('')
            setNotifyLoading(false)
        }
    };

    if (error) {
        return <Empty title={'Error'} subtitle={"Something went wrong."}/>
    }

    if (isLoading) {
        return <Loader/>
    }

    const notifications = data?.data?.data

    return (
        <Box>
            {notifications?.length > 0 ? (
                <TableContainer component={Paper}>
                    <Table aria-label={'simple table'}>
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    Sender
                                </TableCell>
                                <TableCell>
                                    Content
                                </TableCell>
                                <TableCell>
                                    Date Time
                                </TableCell>
                                <TableCell>
                                    Action
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {notifications && notifications?.sort((a: Notification, b: Notification) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))?.map((notification: Notification & {
                                sender: User
                            }) => (<TableRow key={notification.id} onClick={() => {
                                router.push(notification.pathName)
                                handleRead(notification.id)
                            }}
                                             sx={{
                                                 cursor: "pointer"
                                             }}
                            >
                                <TableCell>
                                    {notification?.sender?.name}
                                </TableCell>
                                <TableCell>{
                                    notification?.notification_text
                                }</TableCell>
                                <TableCell>
                                    {
                                        new Date(notification?.createdAt).toLocaleString()
                                    }
                                </TableCell>
                                <TableCell>
                                    {!notification.read && <LoadingButton
                                        loading={notifyLoading && notifyId === notification.id}
                                        onClick={() => handleRead(notification.id)}
                                    >
                                        Mark as read
                                    </LoadingButton>}
                                </TableCell>
                            </TableRow>))}
                        </TableBody>
                    </Table>
                </TableContainer>) : (
                <Empty title="Notification Unavailable" subtitle="You have no notification, yet!"/>
            )}

        </Box>

    );
}
