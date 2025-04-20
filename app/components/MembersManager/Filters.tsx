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
  Fade,
} from "@mui/material";
import {
  Search,
  Refresh,
  FilterList,
  Download,
} from "@mui/icons-material";
import { FiltersProps } from "@/app/types/members";

const Filters: React.FC<FiltersProps> = ({
  searchTerm,
  handleSearchChange,
  toggleFilters,
  resetFilters,
  filtersOpen,
  filterRole,
  handleFilterRoleChange,
  sessionUser,
  styles,
}) => {
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <TextField
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
            size="small"
            sx={{
              ...styles.searchField,
              width: { xs: "100%", sm: "300px" }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Mostrar/ocultar filtros">
            <IconButton
              color="primary"
              onClick={toggleFilters}
              sx={{ ml: 1, display: { xs: 'flex', md: 'none' } }}
            >
              <FilterList />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
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

      <Fade in={filtersOpen}>
        <Box sx={{ display: filtersOpen ? "flex" : "none", flexWrap: "wrap", gap: 2, mt: 2 }}>
          {sessionUser?.role !== "trainer" && (
            <FormControl size="small" variant="outlined" sx={{ minWidth: { xs: "100%", sm: "200px" } }}>
              <InputLabel id="role-filter-label">Filtrar por rol</InputLabel>
              <Select
                labelId="role-filter-label"
                value={filterRole}
                onChange={handleFilterRoleChange}
                label="Filtrar por rol"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="user">Usuario</MenuItem>
                <MenuItem value="employee">Empleado</MenuItem>
                <MenuItem value="court_manager">Gestor de pista</MenuItem>
                <MenuItem value="member">Miembro</MenuItem>
                <MenuItem value="trainer">Entrenador</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>
      </Fade>
    </Box>
  );
};

export default Filters;