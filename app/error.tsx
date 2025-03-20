"use client";

import Box from "@mui/material/Box";
import { useEffect } from "react";

interface ErrorStateProps {
  error: Error;
}
const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <h1>Something went wrong</h1>
        <p>{error.message}</p>
      </Box>
    </Box>
  );
};

export default ErrorState;

