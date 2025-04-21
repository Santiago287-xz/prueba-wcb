import React from "react";
import {
  Box,
  Typography,
  Button,
  Divider,
  List,
  Card,
  CardContent,
  Grid,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  FitnessCenter,
  SportsMartialArts,
  Edit,
  Delete,
} from "@mui/icons-material";
import { UserExercisesProps } from "@/app/types/members";

const UserExercises: React.FC<UserExercisesProps> = ({
  exercises,
  sessionUser,
  selectedUser,
  setDetailsDialogOpen,
  router,
  formatDate,
  handleEditExercise,
  handleDeleteExercise,
}) => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Ejercicios Asignados
        </Typography>
        {sessionUser?.role === 'trainer' && selectedUser && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<SportsMartialArts />}
            onClick={() => {
              if (setDetailsDialogOpen) setDetailsDialogOpen(false);
              router.push(`/manage-user/${selectedUser}`);
            }}
          >
            Añadir ejercicios
          </Button>
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />
      
      {exercises && exercises.length > 0 ? (
        <List disablePadding>
          {exercises.map((exercise, index) => (
            <Card 
              key={exercise.id || index} 
              variant="outlined" 
              sx={{ 
                mb: 1, 
                borderRadius: '10px',
                borderColor: 'primary.light',
                background: 'rgba(25, 118, 210, 0.04)'
              }}
            >
              <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FitnessCenter color="primary" sx={{ mr: 1 }} fontSize="small" />
                      <Typography variant="subtitle2" fontWeight="bold">
                        {exercise.exerciseName}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} sm={1.5}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Series:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {exercise.sets}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={1.5}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Repeticiones:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {exercise.reps}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={1.5}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Peso:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {exercise.weight} kg
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6} sm={2.5}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Asignado:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatDate(exercise.assignedAt)}
                    </Typography>
                  </Grid>

                  {sessionUser?.role === 'trainer' && (
                    <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Tooltip title="Editar ejercicio">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => exercise.id && handleEditExercise(exercise.id)}
                          sx={{
                            transition: "all 0.2s",
                            "&:hover": {
                              transform: "scale(1.1)",
                              backgroundColor: "rgba(63, 81, 181, 0.08)"
                            }
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar ejercicio">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => exercise.id && handleDeleteExercise(exercise.id)}
                          sx={{
                            ml: 1,
                            transition: "all 0.2s",
                            "&:hover": {
                              transform: "scale(1.1)",
                              backgroundColor: "rgba(244, 67, 54, 0.08)"
                            }
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          ))}
        </List>
      ) : (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <FitnessCenter sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            No hay ejercicios asignados
          </Typography>
          {sessionUser?.role === 'trainer' && selectedUser && (
            <Button
              variant="outlined"
              size="small"
              color="primary"
              startIcon={<SportsMartialArts />}
              onClick={() => {
                if (setDetailsDialogOpen) setDetailsDialogOpen(false);
                router.push(`/manage-user/${selectedUser}`);
              }}
              sx={{ mt: 2 }}
            >
              Asignar ejercicios
            </Button>
          )}
        </Box>
      )}
    </>
  );
};

export default UserExercises;