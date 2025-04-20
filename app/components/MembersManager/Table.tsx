import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
  TablePagination,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Avatar,
  LinearProgress,
} from "@mui/material";
import {
  Delete,
  Edit,
  Visibility,
  SportsMartialArts,
} from "@mui/icons-material";
import { UserTableProps } from "@/app/types/members";

const UserTable: React.FC<UserTableProps> = ({
  data,
  isLoading,
  filteredAndSortedData,
  handleOpenDetails,
  setUserToDelete,
  setDeleteDialogOpen,
  orderBy,
  order,
  handleSortChange,
  sessionUser,
  getRoleName,
  getRoleColor,
  getInitials,
  router,
  styles,
}) => {
  return (
    <>
      {(isLoading) && (
        <LinearProgress color="primary" sx={{ height: "3px" }} />
      )}

      <TableContainer component={Paper} elevation={0}>
        <Table sx={{ minWidth: 500 }} aria-label="tabla de usuarios">
          <TableHead>
            <TableRow>
              <TableCell sx={styles.tableHeaderCell}>Usuario</TableCell>
              <TableCell sx={{ ...styles.tableHeaderCell, display: { xs: "none", sm: "table-cell" } }}>
                <TableSortLabel
                  active={orderBy === "email"}
                  direction={order}
                  onClick={handleSortChange("email")}
                >
                  Email
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ ...styles.tableHeaderCell, display: { xs: "none", sm: "table-cell" } }}>
                Género
              </TableCell>
              <TableCell sx={{ ...styles.tableHeaderCell, display: { xs: "none", sm: "table-cell" } }}>
                Edad
              </TableCell>
              <TableCell sx={styles.tableHeaderCell}>
                <TableSortLabel
                  active={orderBy === "role"}
                  direction={order}
                  onClick={handleSortChange("role")}
                >
                  Rol
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={styles.tableHeaderCell}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from(new Array(3)).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell colSpan={6} sx={{ py: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.08)", mr: 2 }} />
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ height: 12, width: "60%", bgcolor: "rgba(0,0,0,0.08)", borderRadius: 1, mb: 1 }} />
                        <Box sx={{ height: 10, width: "40%", bgcolor: "rgba(0,0,0,0.05)", borderRadius: 1 }} />
                      </Box>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : filteredAndSortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: "text.secondary" }}>
                    No se encontraron usuarios
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Prueba a cambiar los filtros o la búsqueda
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedData.map((user: User & { trainer: User | null }) => (
                <TableRow
                  key={user?.id}
                  sx={styles.tableRow}
                >
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Avatar sx={styles.userAvatar}>
                        {getInitials(user?.name || '')}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {user?.name || 'Sin nombre'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>
                          ID: {user?.id?.substring(0, 8)}...
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, color: "text.secondary" }}>{user?.email}</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{user?.gender || "-"}</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{user?.age || "-"}</TableCell>
                  <TableCell>
                    {user?.role === "receptionist" ? (
                      <Chip
                        label="Recepcionista"
                        size="small"
                        sx={{ 
                          fontWeight: 500, 
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          height: "24px",
                          backgroundColor: "red",
                          color: "#fff"
                        }}
                      />
                    ) : (
                      <Chip
                        label={getRoleName(user?.role)}
                        size="small"
                        color={getRoleColor(user?.role)}
                        sx={{ 
                          fontWeight: 500, 
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          height: "24px"
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Ver detalles" arrow>
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleOpenDetails(user.id)}
                          sx={{
                            transition: "all 0.2s",
                            "&:hover": {
                              transform: "scale(1.1)",
                              backgroundColor: "rgba(63, 81, 181, 0.08)"
                            },
                          }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {sessionUser?.role === 'trainer' ? (
                        <Tooltip title="Asignar ejercicios" arrow>
                          <IconButton
                            color="success"
                            size="small"
                            onClick={() => router.push(`/manage-user/${user.id}`)}
                            sx={{
                              transition: "all 0.2s",
                              "&:hover": {
                                transform: "scale(1.1)",
                                backgroundColor: "rgba(76, 175, 80, 0.08)"
                              },
                            }}
                          >
                            <SportsMartialArts fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <>
                          <Tooltip title="Editar usuario" arrow>
                            <IconButton
                              color="info"
                              size="small"
                              sx={{
                                transition: "all 0.2s",
                                "&:hover": {
                                  transform: "scale(1.1)",
                                  backgroundColor: "rgba(3, 169, 244, 0.08)"
                                },
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Eliminar usuario" arrow>
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => {
                                setUserToDelete(user.id);
                                setDeleteDialogOpen(true);
                              }}
                              sx={{
                                transition: "all 0.2s",
                                "&:hover": {
                                  transform: "scale(1.1)",
                                  backgroundColor: "rgba(244, 67, 54, 0.08)"
                                },
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        p: 2,
        borderTop: "1px solid rgba(224, 224, 224, 1)"
      }}>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2, display: { xs: "none", sm: "block" } }}>
          {data?.count ? `Total: ${data.count} usuarios` : ""}
        </Typography>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={data?.count ?? 0}
          rowsPerPage={10}
          page={0}
          onPageChange={() => {}}
          onRowsPerPageChange={() => {}}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to === -1 ? count : to} de ${count}`}
        />
      </Box>
    </>
  );
};

export default UserTable;