import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  TextField,
  CircularProgress,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import { EditExerciseDialogProps } from "@/app/types/members";

const EditExerciseDialog: React.FC<EditExerciseDialogProps> = ({
  editExerciseDialogOpen,
  setEditExerciseDialogOpen,
  editExerciseData,
  setEditExerciseData,
  handleSaveExercise,
  loadingExerciseEdit,
}) => {
  return (
    <Dialog
      open={editExerciseDialogOpen}
      onClose={() => setEditExerciseDialogOpen(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)"
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Edit color="primary" />
          <Typography variant="h6">Editar Ejercicio</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {loadingExerciseEdit ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Nombre del ejercicio"
                value={editExerciseData.exerciseName}
                onChange={(e) => setEditExerciseData({...editExerciseData, exerciseName: e.target.value})}
                fullWidth
                variant="outlined"
                margin="dense"
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                label="Series"
                type="number"
                value={editExerciseData.sets}
                onChange={(e) => setEditExerciseData({...editExerciseData, sets: parseInt(e.target.value) || 0})}
                fullWidth
                variant="outlined"
                margin="dense"
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                label="Repeticiones"
                type="number"
                value={editExerciseData.reps}
                onChange={(e) => setEditExerciseData({...editExerciseData, reps: parseInt(e.target.value) || 0})}
                fullWidth
                variant="outlined"
                margin="dense"
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                label="Peso (kg)"
                type="number"
                value={editExerciseData.weight}
                onChange={(e) => setEditExerciseData({...editExerciseData, weight: parseInt(e.target.value) || 0})}
                fullWidth
                variant="outlined"
                margin="dense"
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          variant="outlined" 
          onClick={() => setEditExerciseDialogOpen(false)}
        >
          Cancelar
        </Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleSaveExercise}
          disabled={loadingExerciseEdit}
        >
          Guardar cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditExerciseDialog;