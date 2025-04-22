import React from "react";
import {
  Box,
  Typography,
  Grid,
} from "@mui/material";

interface HeaderProps {
  styles: any;
}

const Header: React.FC<HeaderProps> = ({ styles }) => {
  return (
    <Box sx={styles.headerContainer}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12}>
          <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 1 }}>
            Panel de Administración de Usuarios
          </Typography>
          <Typography variant="body1" color="rgba(255,255,255,0.8)" sx={{ mb: 1 }}>
            Gestiona todos los usuarios, asigna entrenadores y administra roles
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Header;