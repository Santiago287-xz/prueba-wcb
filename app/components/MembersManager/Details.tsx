import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Typography,
  Box,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
} from "@mui/material";
import { UserDetailsProps } from "@/app/types/members";
import UserExercises from "./Exercises";

const UserDetails: React.FC<UserDetailsProps> = ({
  detailsDialogOpen,
  setDetailsDialogOpen,
  userDetails,
  loadingDetails,
  selectedUser,
  sessionUser,
  router,
  theme,
  getInitials,
  getRoleName,
  getRoleColor,
  getGoalName,
  getLevelName,
  formatDate,
  handleEditExercise,
  handleDeleteExercise,
}) => {
  return (
    <Dialog
      open={detailsDialogOpen}
      onClose={() => setDetailsDialogOpen(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)"
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
          {userDetails ? getInitials(userDetails.name) : '...'}
        </Avatar>
        <Typography variant="h6">Detalles del Usuario</Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        {loadingDetails ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : userDetails ? (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Información Personal
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Nombre:
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="body2" fontWeight="medium">
                          {userDetails.name}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Email:
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="body2">
                          {userDetails.email}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Rol:
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Chip 
                          label={getRoleName(userDetails.role)} 
                          color={getRoleColor(userDetails.role)}
                          size="small"
                        />
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Género:
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="body2">
                          {userDetails.gender === 'male' ? 'Masculino' : 'Femenino'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Edad:
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="body2">
                          {userDetails.age} años
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Perfil Deportivo
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Altura:
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          {userDetails.height} cm
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Peso:
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          {userDetails.weight} kg
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Objetivo:
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          {getGoalName(userDetails.goal)}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Nivel:
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          {getLevelName(userDetails.level)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            <UserExercises 
              exercises={userDetails.exercises}
              sessionUser={sessionUser}
              selectedUser={selectedUser}
              setDetailsDialogOpen={setDetailsDialogOpen}
              router={router}
              formatDate={formatDate}
              handleEditExercise={handleEditExercise}
              handleDeleteExercise={handleDeleteExercise}
            />
          </>
        ) : (
          <Typography color="text.secondary">No se pudo cargar la información del usuario</Typography>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          variant="outlined"
          onClick={() => setDetailsDialogOpen(false)}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDetails;