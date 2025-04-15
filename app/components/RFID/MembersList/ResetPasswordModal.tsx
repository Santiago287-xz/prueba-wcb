import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import { Close, Key } from '@mui/icons-material';

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  newPassword: string;
  userName: string;
}

export default function ResetPasswordModal({
  open,
  onClose,
  newPassword,
  userName
}: ResetPasswordModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        sx={{
          textAlign: 'center',
          bgcolor: 'primary.main',
          color: 'white',
          py: 2
        }}
      >
        Nueva Contraseña Generada
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'white'
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: 4,
          pb: 4
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 2
          }}
        >
          <Key sx={{ color: 'primary.main', mr: 1, fontSize: 28 }} />
          <Typography variant="h5" fontWeight="medium" color="primary.main">
            Contraseña restablecida correctamente
          </Typography>
        </Box>

        <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
          La nueva contraseña para <strong>{userName}</strong> es:
        </Typography>

        <Box
          sx={{
            p: 3,
            border: '3px dashed',
            borderColor: 'primary.main',
            borderRadius: 2,
            width: '250px',
            textAlign: 'center',
            mb: 2,
            bgcolor: 'primary.50'
          }}
        >
          <Typography
            variant="h3"
            fontFamily="monospace"
            fontWeight="bold"
            color="primary.dark"
            letterSpacing={2}
          >
            {newPassword}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          Esta contraseña debe ser proporcionada al usuario para que pueda acceder a su cuenta.
          <br />
          Anótela antes de cerrar esta ventana.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={onClose}
        >
          Entendido
        </Button>
      </DialogActions>
    </Dialog>
  );
}