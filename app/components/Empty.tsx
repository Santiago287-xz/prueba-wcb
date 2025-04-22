"use client";

import Link from "next/link";
import { Box, Typography } from "@mui/material";

interface EmptyProps {
  title?: string;
  subtitle?: string;
  showReset?: boolean;
}

const Empty: React.FC<EmptyProps> = ({
  title = "No exact matches",
  subtitle = "Try changing or removing some of your filters",
  showReset,
}) => {
  return (
    <Box
      component="div"
      sx={{
        height: "60vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <Typography className={"text-2xl font-bold"}>{title}</Typography>
      <Typography className={"text-lg text-gray-500"}>{subtitle}</Typography>

      <Box className={"w-48 mt-4"}>
        {showReset && <Link href={"/"}>Volver al inicio</Link>}
      </Box>
    </Box>
  );
};

export default Empty;
