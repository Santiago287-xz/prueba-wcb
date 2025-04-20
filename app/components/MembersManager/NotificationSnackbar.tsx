import React from "react";
import {
  Snackbar,
  Alert,
} from "@mui/material";

interface NotificationSnackbarProps {
  snackbarOpen: boolean;
  setSnackbarOpen: (open: boolean) => void;
  snackbarMessage: string;
  snackbarSeverity: "success" | "error" | "info" | "warning";
}

const NotificationSnackbar: React.FC<NotificationSnackbarProps> = ({
  snackbarOpen,
  setSnackbarOpen,
  snackbarMessage,
  snackbarSeverity,
}) => {
  return (
    <Snackbar
      open={snackbarOpen}
      autoHideDuration={4000}
      onClose={() => setSnackbarOpen(false)}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      sx={{ bottom: { xs: 16, sm: 24 } }}
    >
      <Alert
        onClose={() => setSnackbarOpen(false)}
        severity={snackbarSeverity}
        variant="filled"
        sx={{
          width: "100%",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          borderRadius: "10px"
        }}
      >
        {snackbarMessage}
      </Alert>
    </Snackbar>
  );
};

export default NotificationSnackbar;