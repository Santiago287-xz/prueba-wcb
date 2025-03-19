import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";

import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import HowToRegIcon from "@mui/icons-material/HowToReg";

import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import NoMealsIcon from "@mui/icons-material/NoMeals";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventNoteIcon from "@mui/icons-material/EventNote";

import Link from "next/link";
import Divider from "@mui/material/Divider";
import {useSession} from "next-auth/react";
import {SessionUser} from "@/types";
import {Skeleton} from "@mui/material";

export default function ListItems() {
    const {data, status} = useSession();

    const user = data?.user as SessionUser;

    return (
        <>
            <Link href="/" passHref>
                <ListItemButton title="Dashboard">
                    <ListItemIcon>
                        <DashboardIcon/>
                    </ListItemIcon>
                    <ListItemText primary="Dashboard"/>
                </ListItemButton>
            </Link>

            {(user?.role === "admin" || user?.role === "trainer") && (
                <Link href="/add-user" passHref>
                    <ListItemButton title="Add User">
                        <ListItemIcon>
                            <PersonAddIcon/>
                        </ListItemIcon>
                        <ListItemText primary="Add User"/>
                    </ListItemButton>
                </Link>
            )}

            {user?.role === "admin" && (<Link href="/manage-user" passHref>
                <ListItemButton title="Manage User">
                    <ListItemIcon>
                        <HowToRegIcon/>
                    </ListItemIcon>
                    <ListItemText primary="Manage User"/>
                </ListItemButton>
            </Link>)}


            <Link href="/trainers" passHref>
                <ListItemButton title="Trainers">
                    <ListItemIcon>
                        <PeopleIcon/>
                    </ListItemIcon>
                    <ListItemText primary="Trainers"/>
                </ListItemButton>
            </Link>
            {(user?.role === "admin" || user?.role === "trainer") && (
                <>
                    <Link href="/students" passHref>
                        <ListItemButton title="Students">
                            <ListItemIcon>
                                <PeopleIcon/>
                            </ListItemIcon>
                            <ListItemText primary="Students"/>
                        </ListItemButton>
                    </Link>
                    <Link href="/attendance" passHref>
                        <ListItemButton title="Attendance">
                            <ListItemIcon>
                                <CalendarMonthIcon/>
                            </ListItemIcon>
                            <ListItemText primary="Attendance"/>
                        </ListItemButton>
                    </Link>
                </>
            )}
            {(user?.role === "admin" || user?.role === "trainer") && (
                <>
                    <Link href="/booking" passHref>
                        <ListItemButton title="Canchas">
                            <ListItemIcon>
                                <CalendarMonthIcon/>
                            </ListItemIcon>
                            <ListItemText primary="Canchas"/>
                        </ListItemButton>
                    </Link>
                </>
            )}
            <Divider sx={{my: 1}}/>
            <ListSubheader component="div" inset>
                Manage
            </ListSubheader>
            {status === "loading" && (
                <>
                    <ListItemButton>
                        <Skeleton
                            variant="rounded"
                            animation="wave"
                            height={40}
                            width={210}
                        />
                    </ListItemButton>
                    <ListItemButton>
                        <Skeleton
                            variant="rounded"
                            animation="wave"
                            height={40}
                            width={210}
                        />
                    </ListItemButton>
                    <ListItemButton>
                        <Skeleton
                            variant="rounded"
                            animation="wave"
                            height={40}
                            width={210}
                        />
                    </ListItemButton>
                    <ListItemButton>
                        <Skeleton
                            variant="rounded"
                            animation="wave"
                            height={40}
                            width={210}
                        />
                    </ListItemButton>
                </>
            )}
            {(user?.role === "admin" || user?.role === "trainer") && (
                <>
                    <Link href="/fees" passHref>
                        <ListItemButton title="Fees">
                            <ListItemIcon>
                                <MonetizationOnIcon/>
                            </ListItemIcon>
                            <ListItemText primary="Fees"/>
                        </ListItemButton>
                    </Link>

                    <Link href="/exercise" passHref>
                        <ListItemButton title="Exercise">
                            <ListItemIcon>
                                <FitnessCenterIcon/>
                            </ListItemIcon>
                            <ListItemText primary="Exercise"/>
                        </ListItemButton>
                    </Link>

                    <Link href="/diet" passHref>
                        <ListItemButton title="Diet">
                            <ListItemIcon>
                                <NoMealsIcon/>
                            </ListItemIcon>
                            <ListItemText primary="Diet"/>
                        </ListItemButton>
                    </Link>
                </>
            )}
            {user?.role === "user" && (
                <>
                    <Link href="/user/attendance" passHref>
                        <ListItemButton title="My Attendance">
                            <ListItemIcon>
                                <CalendarMonthIcon/>
                            </ListItemIcon>
                            <ListItemText primary="My Attendance"/>
                        </ListItemButton>
                    </Link>
                    <Link href="/user/fees" passHref>
                        <ListItemButton title="My Fees">
                            <ListItemIcon>
                                <MonetizationOnIcon/>
                            </ListItemIcon>
                            <ListItemText primary="My Fees"/>
                        </ListItemButton>
                    </Link>
                    <Link href="/user/exercise" passHref>
                        <ListItemButton title="My Exercise">
                            <ListItemIcon>
                                <FitnessCenterIcon/>
                            </ListItemIcon>
                            <ListItemText primary="My Exercise"/>
                        </ListItemButton>
                    </Link>
                    <Link href="/user/diet" passHref>
                        <ListItemButton title="My Diet Sheet">
                            <ListItemIcon>
                                <NoMealsIcon/>
                            </ListItemIcon>
                            <ListItemText primary="My Diet Sheet"/>
                        </ListItemButton>
                    </Link>
                </>
            )}
        </>
    );
}
