import React from "react";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery
} from "@mui/material";
import {
  Search,
  Refresh,
  Download,
} from "@mui/icons-material";
import { FiltersProps } from "@/app/types/members";

const Filters: React.FC<FiltersProps> = ({
  searchTerm,
  handleSearchChange,
  resetFilters,
  filterRole,
  handleFilterRoleChange,
  sessionUser,
  styles,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  
  return (
    <Box sx={{ p: 3 }}>
      {isMobile ? (
        <>
          {/* Barra de búsqueda arriba */}
          <Box sx={{ mb: 2 }}>
            <TextField
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={handleSearchChange}
              variant="outlined"
              size="small"
              fullWidth
              sx={{
                ...styles.searchField,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          {/* Filtros e íconos abajo */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {sessionUser?.role === "admin" && (
              <FormControl
                size="small"
                variant="outlined"
                fullWidth
              >
                <InputLabel id="role-filter-label">Filtrar por rol</InputLabel>
                <Select
                  labelId="role-filter-label"
                  value={filterRole}
                  onChange={handleFilterRoleChange}
                  label=" rol"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="user">Usuario</MenuItem>
                  <MenuItem value="employee">Empleado</MenuItem>
                  <MenuItem value="court_manager">Gestor de Canchas</MenuItem>
                  <MenuItem value="member">Miembro</MenuItem>
                  <MenuItem value="trainer">Entrenador</MenuItem>
                </Select>
              </FormControl>
            )}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title="Exportar datos">
                <IconButton color="primary">
                  <Download />
                </IconButton>
              </Tooltip>
              <Tooltip title="Restablecer filtros">
                <IconButton onClick={resetFilters} color="primary">
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </>
      ) : (
        // Layout original para desktop
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <TextField
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={handleSearchChange}
              variant="outlined"
              size="small"
              sx={{
                ...styles.searchField,
                width: { xs: "100%", sm: "250px" },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
              }}
            />
            {sessionUser?.role === "admin" && (
              <FormControl
                size="small"
                variant="outlined"
                sx={{ minWidth: { xs: "100%", sm: "200px" } }}
              >
                <InputLabel id="role-filter-label">Filtrar por rol</InputLabel>
                <Select
                  labelId="role-filter-label"
                  value={filterRole}
                  onChange={handleFilterRoleChange}
                  label=" rol"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="receptionist">Recepcionista</MenuItem>
                  <MenuItem value="court_manager">Gestor de Canchas</MenuItem>
                  <MenuItem value="member">Miembro</MenuItem>
                  <MenuItem value="trainer">Entrenador</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Exportar datos">
              <IconButton color="primary">
                <Download />
              </IconButton>
            </Tooltip>
            <Tooltip title="Restablecer filtros">
              <IconButton onClick={resetFilters} color="primary">
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Filters;