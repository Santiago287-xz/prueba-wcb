// app/components/RFIDCardForm.tsx
'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/lab';
import axios from 'axios';

interface RFIDCardFormProps {
  userId: string;
  userName: string;
  onSuccess: () => void;
}

const RFIDCardForm: React.FC<RFIDCardFormProps> = ({ userId, userName, onSuccess }) => {
  const [rfidCardNumber, setRfidCardNumber] = useState('');
  const [membershipType, setMembershipType] = useState('standard');
  const [membershipExpiry, setMembershipExpiry] = useState<Date | null>(
    new Date(new Date().setMonth(new Date().getMonth() + 1))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/api/rfid/assign', {
        userId,
        rfidCardNumber,
        membershipType,
        membershipExpiry: membershipExpiry?.toISOString(),
      });

      setSuccess(true);
      setRfidCardNumber('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al asignar tarjeta RFID');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Asignar tarjeta RFID a {userName}
      </Typography>

      <TextField
        label="Número de tarjeta RFID"
        value={rfidCardNumber}
        onChange={(e) => setRfidCardNumber(e.target.value)}
        fullWidth
        required
        margin="normal"
      />

      <FormControl fullWidth margin="normal">
        <InputLabel>Tipo de membresía</InputLabel>
        <Select
          value={membershipType}
          onChange={(e) => setMembershipType(e.target.value)}
          label="Tipo de membresía"
        >
          <MenuItem value="standard">Estándar</MenuItem>
          <MenuItem value="premium">Premium</MenuItem>
          <MenuItem value="vip">VIP</MenuItem>
        </Select>
      </FormControl>

      <DatePicker
        label="Fecha de expiración"
        value={membershipExpiry}
        onChange={(newValue) => setMembershipExpiry(newValue)}
        renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
      />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
      >
        {loading ? 'Asignando...' : 'Asignar Tarjeta RFID'}
      </Button>

      <Snackbar open={success} autoHideDuration={6000} onClose={() => setSuccess(false)}>
        <Alert onClose={() => setSuccess(false)} severity="success">
          Tarjeta RFID asignada correctamente
        </Alert>
      </Snackbar>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RFIDCardForm;