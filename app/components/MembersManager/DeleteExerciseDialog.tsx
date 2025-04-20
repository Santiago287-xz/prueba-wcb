import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { DeleteExerciseDialogProps } from "@/app/types/members";

const DeleteExerciseDialog: React.FC<DeleteExerciseDialogProps> = ({
  deleteExerciseDialogOpen,
  setDeleteExerciseDialogOpen,
  handleConfirmDeleteExercise,
  loadingExerciseDelete,
}) => {
  return (
    <Dialog
      open={deleteExerciseDialogOpen}
      onClose={() => setDeleteExerciseDialogOpen(false)}
      maxWidth="xs"
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
          <Delete color="error" />
          <Typography variant="h6">Eliminar Ejercicio</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          ¿Está seguro de que desea eliminar este ejercicio? Esta acción no se puede deshacer.
        </DialogContentText>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          variant="outlined" 
          onClick={() => setDeleteExerciseDialogOpen(false)}
        >
          Cancelar
        </Button>
        <Button 
          variant="contained" 
          color="error"
          onClick={handleConfirmDeleteExercise}
          disabled={loadingExerciseDelete}
          startIcon={loadingExerciseDelete ? <CircularProgress size={16} /> : null}
        >
          Eliminar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteExerciseDialog;