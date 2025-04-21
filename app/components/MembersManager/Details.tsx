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
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  Skeleton,
  useMediaQuery,
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const DetailSkeleton = () => (
    <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Primer Card */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {[...Array(5)].map((_, index) => (
                  <React.Fragment key={index}>
                    <Grid item xs={5} sm={4}>
                      <Skeleton variant="text" width="80%" />
                    </Grid>
                    <Grid item xs={7} sm={8}>
                      <Skeleton variant="text" width="90%" />
                    </Grid>
                  </React.Fragment>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        {/* Segundo Card */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {[...Array(4)].map((_, index) => (
                  <React.Fragment key={index}>
                    <Grid item xs={6}>
                      <Skeleton variant="text" width="80%" />
                    </Grid>
                    <Grid item xs={6}>
                      <Skeleton variant="text" width="70%" />
                    </Grid>
                  </React.Fragment>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Sección de ejercicios: solo se muestra si el usuario NO es admin */}
      {sessionUser?.role !== 'admin' && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Skeleton variant="text" width="40%" height={32} sx={{ mb: 1 }} />
            <Divider sx={{ mb: 2 }} />
            {[...Array(3)].map((_, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Skeleton variant="rectangular" height={60} />
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <Dialog
      open={detailsDialogOpen}
      onClose={() => setDetailsDialogOpen(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
          m: isMobile ? 1 : 4,
          width: isMobile ? 'calc(100% - 16px)' : undefined,
        }
      }}
    >
      <DialogTitle sx={{
        pb: 1,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        pt: isMobile ? 2 : undefined,
        gap: 1,
      }}>
        {loadingDetails ? (
          <Skeleton variant="circular" width={40} height={40} />
        ) : (
          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
            {userDetails ? getInitials(userDetails.name) : '...'}
          </Avatar>
        )}
        <span>
          {loadingDetails ? (
            <Skeleton variant="text" width={150} />
          ) : (
            "Detalles del Usuario"
          )}
        </span>
      </DialogTitle>

      <DialogContent dividers sx={{
        p: isMobile ? 2 : 3,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: '4px',
        }
      }}>
        {loadingDetails ? (
          <DetailSkeleton />
        ) : userDetails ? (
          <>
            <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: isMobile ? '1rem' : undefined }}>
                      Información Personal
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={isMobile ? 1 : 2}>
                      <Grid item xs={5} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Nombre:
                        </Typography>
                      </Grid>
                      <Grid item xs={7} sm={8}>
                        <Typography variant="body2" fontWeight="medium" sx={{ wordBreak: 'break-word' }}>
                          {userDetails.name}
                        </Typography>
                      </Grid>

                      <Grid item xs={5} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Email:
                        </Typography>
                      </Grid>
                      <Grid item xs={7} sm={8}>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          {userDetails.email}
                        </Typography>
                      </Grid>

                      <Grid item xs={5} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Rol:
                        </Typography>
                      </Grid>
                      <Grid item xs={7} sm={8}>
                        <Chip
                          label={getRoleName(userDetails.role)}
                          color={getRoleColor(userDetails.role)}
                          size="small"
                        />
                      </Grid>

                      <Grid item xs={5} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Género:
                        </Typography>
                      </Grid>
                      <Grid item xs={7} sm={8}>
                        <Typography variant="body2">
                          {userDetails.gender === 'male' ? 'Masculino' : 'Femenino'}
                        </Typography>
                      </Grid>

                      <Grid item xs={5} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Edad:
                        </Typography>
                      </Grid>
                      <Grid item xs={7} sm={8}>
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
                  <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: isMobile ? '1rem' : undefined }}>
                      Perfil Deportivo
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={isMobile ? 1 : 2}>
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
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
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

            {sessionUser?.role !== 'admin' && (
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
            )}
          </>
        ) : (
          <Typography color="text.secondary">No se pudo cargar la información del usuario</Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: isMobile ? 2 : 3, py: isMobile ? 1.5 : 2, justifyContent: 'center' }}>
        <Button
          variant="outlined"
          onClick={() => setDetailsDialogOpen(false)}
          fullWidth={isMobile}
          size={isMobile ? "medium" : "large"}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDetails;