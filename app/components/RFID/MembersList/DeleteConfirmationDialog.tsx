import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { Close, Warning } from '@mui/icons-material';
import { Member } from '@/app/types/membership';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  member: Member | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export default function DeleteConfirmationDialog({
  open,
  onClose,
  member,
  isDeleting,
  onConfirm
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => !isDeleting && onClose()}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        Confirmar Eliminación
        <IconButton
          aria-label="close"
          onClick={() => !isDeleting && onClose()}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          disabled={isDeleting}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Alert severity="error" icon={<Warning />} sx={{ mb: 2 }}>
          ¿Estás seguro de eliminar a este miembro?
        </Alert>
        {member && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="medium">
              {member.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {member.email}
            </Typography>
            {member.rfidCardNumber && (
              <Typography variant="body2" fontFamily="monospace" mt={1}>
                Tarjeta: {member.rfidCardNumber}
              </Typography>
            )}
          </Box>
        )}
        <Typography variant="body2" color="error.main" fontWeight="medium">
          Esta acción no se puede deshacer y eliminará todos los datos asociados.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          disabled={isDeleting}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={isDeleting}
          startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isDeleting ? "Eliminando..." : "Eliminar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}