import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  IconButton,
  Paper,
  Card,
  CardContent,
  Divider,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import { Close, Warning } from '@mui/icons-material';
import { Member, MembershipPrice, RenewalState } from '@/app/types/membership';

interface RenewMembershipModalProps {
  open: boolean;
  onClose: () => void;
  member: Member | null;
  membershipPrices: MembershipPrice[];
  confirmOpen: boolean;
  setConfirmOpen: (open: boolean) => void;
  onSuccess: () => void;
  showNotification: (message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function RenewMembershipModal({
  open,
  onClose,
  member,
  membershipPrices,
  confirmOpen,
  setConfirmOpen,
  onSuccess,
  showNotification
}: RenewMembershipModalProps) {
  // Renewal state
  const [renewalState, setRenewalState] = useState<RenewalState>({
    membershipTypeId: '',
    pointsAmount: 10,
    paymentMethod: 'cash',
    totalAmount: 0
  });

  // Initialize form with default values when modal opens or member changes
  useEffect(() => {
    if (member) {
      const memberType = member.membershipType || membershipPrices[0]?.id || '';
      const selectedPrice = membershipPrices.find(p => p.id === memberType);

      setRenewalState({
        membershipTypeId: memberType,
        pointsAmount: 10,
        paymentMethod: 'cash',
        totalAmount: selectedPrice ? Math.round((selectedPrice.basePrice / 30) * 10 * 100) / 100 : 0
      });
    }
  }, [member, membershipPrices]);

  // Calculate total amount when membership type or points amount changes
  useEffect(() => {
    if (renewalState.membershipTypeId && renewalState.pointsAmount > 0) {
      const selectedType = membershipPrices.find(p => p.id === renewalState.membershipTypeId);
      if (selectedType) {
        // Calculate cost based on points (30 points = full price)
        const pointCost = selectedType.basePrice / 30;
        setRenewalState(prev => ({
          ...prev,
          totalAmount: Math.round(pointCost * prev.pointsAmount * 100) / 100
        }));
      }
    }
  }, [renewalState.membershipTypeId, renewalState.pointsAmount, membershipPrices]);

  // Handle text input changes
  const handleRenewalTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!name) return;

    setRenewalState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle select changes
  const handleRenewalSelectChange = (e: SelectChangeEvent<string | number>) => {
    const { name, value } = e.target;
    if (!name) return;

    setRenewalState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleRenewMembership = async () => {
    if (!member) return;

    try {
      const selectedType = membershipPrices.find(p => p.id === renewalState.membershipTypeId);
      if (!selectedType) {
        showNotification('Tipo de membresía no válido', 'error');
        return;
      }

      // Register the transaction
      await axios.post('/api/transactions', {
        type: 'income',
        category: 'membership',
        amount: renewalState.totalAmount,
        description: `Recarga de ${renewalState.pointsAmount} puntos de acceso para ${member.name}`,
        paymentMethod: renewalState.paymentMethod,
        userId: member.id,
      });

      // Update the user's points
      await axios.post('/api/members/rfid/assign', {
        userId: member.id,
        rfidCardNumber: member.rfidCardNumber,
        membershipType: renewalState.membershipTypeId,
        membershipStatus: 'active',
        accessPoints: member.accessPoints + renewalState.pointsAmount,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error renewing membership:', error);
      showNotification(error.response?.data?.error || 'Error al recargar puntos', 'error');
    }
  };

  return (
    <>
      {/* Main Renewal Dialog */}
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Recargar Puntos de Acceso
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {member && (
            <Box>
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {member.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tarjeta: <span style={{ fontFamily: 'monospace' }}>{member.rfidCardNumber}</span>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Puntos actuales: {member.accessPoints || 0}
                </Typography>
              </Paper>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo de Membresía</InputLabel>
                    <Select
                      name="membershipTypeId"
                      value={renewalState.membershipTypeId}
                      onChange={handleRenewalSelectChange}
                      label="Tipo de Membresía"
                      disabled={membershipPrices.length === 0}
                    >
                      {membershipPrices.map(price => (
                        <MenuItem key={price.id} value={price.id}>
                          {price.name} (${price.basePrice})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Cantidad de puntos</InputLabel>
                    <Select
                      name="pointsAmount"
                      value={renewalState.pointsAmount}
                      onChange={handleRenewalSelectChange}
                      label="Cantidad de puntos"
                    >
                      <MenuItem value={5}>5 puntos</MenuItem>
                      <MenuItem value={10}>10 puntos</MenuItem>
                      <MenuItem value={20}>20 puntos</MenuItem>
                      <MenuItem value={30}>30 puntos</MenuItem>
                      <MenuItem value={50}>50 puntos</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Método de Pago</InputLabel>
                    <Select
                      name="paymentMethod"
                      value={renewalState.paymentMethod}
                      onChange={handleRenewalSelectChange}
                      label="Método de Pago"
                    >
                      <MenuItem value="cash">Efectivo</MenuItem>
                      <MenuItem value="card">Tarjeta</MenuItem>
                      <MenuItem value="transfer">Transferencia</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Card
                variant="outlined"
                sx={{ mt: 3, bgcolor: 'primary.50' }}
              >
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Total a pagar:</Typography>
                      <Typography variant="h5" color="primary.main" fontWeight="bold">
                        ${renewalState.totalAmount}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2">Puntos totales:</Typography>
                      <Typography variant="h6" color="primary.main">
                        {(member.accessPoints || 0) + renewalState.pointsAmount} puntos
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => setConfirmOpen(true)}
            disabled={membershipPrices.length === 0}
          >
            Recargar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Confirmar Recarga de Puntos
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
            ¿Confirmar la recarga de puntos?
          </Alert>

          {member && (
            <Box>
              <Typography variant="body1" fontWeight="medium">
                {member.name}
              </Typography>
              <Divider sx={{ my: 1 }} />

              <Grid container spacing={1} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Tipo:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    {membershipPrices.find(p => p.id === renewalState.membershipTypeId)?.name || renewalState.membershipTypeId}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Puntos a recargar:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    {renewalState.pointsAmount} puntos
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight="medium">
                    ${renewalState.totalAmount}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Método de pago:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    {renewalState.paymentMethod === 'cash' ? 'Efectivo' :
                      renewalState.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRenewMembership}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}