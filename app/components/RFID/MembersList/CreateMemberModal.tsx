import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  IconButton,
  CircularProgress,
  Card,
  CardContent,
  SelectChangeEvent
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { MembershipPrice, Trainer, FormState, FormErrors } from '@/app/types/membership';

interface CreateMemberModalProps {
  open: boolean;
  onClose: () => void;
  membershipPrices: MembershipPrice[];
  trainers: Trainer[];
  onSuccess: (name: string, pin: string) => void;
  isCreatingMember: boolean;
  setIsCreatingMember: (creating: boolean) => void;
  showNotification: (message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function CreateMemberModal({
  open,
  onClose,
  membershipPrices,
  trainers,
  onSuccess,
  isCreatingMember,
  setIsCreatingMember,
  showNotification
}: CreateMemberModalProps) {
  // Form state
  const [formState, setFormState] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    gender: 'male',
    age: '',
    rfidCardNumber: '',
    membershipTypeId: '',
    membershipStatus: 'active',
    accessPoints: 30,
    paymentMethod: 'cash',
    height: '',
    weight: '',
    goal: 'lose_weight',
    level: 'beginner',
    trainer: ''
  });

  // Form errors
  const [errors, setErrors] = useState<FormErrors>({
    name: false,
    email: false,
    rfidCardNumber: false,
    phone: false,
    age: false,
    height: false,
    weight: false
  });

  // Calculate total amount based on membership price and access points
  const [totalAmount, setTotalAmount] = useState(0);

  // Initialize form with default values when modal opens
  useEffect(() => {
    if (open) {
      setFormState({
        name: '',
        email: '',
        phone: '',
        gender: 'male',
        age: '',
        rfidCardNumber: '',
        membershipTypeId: membershipPrices.length > 0 ? membershipPrices[0].id : '',
        membershipStatus: 'active',
        accessPoints: 30,
        paymentMethod: 'cash',
        height: '',
        weight: '',
        goal: 'lose_weight',
        level: 'beginner',
        trainer: trainers.length > 0 ? trainers[0].id : ''
      });

      setErrors({
        name: false,
        email: false,
        rfidCardNumber: false,
        phone: false,
        age: false,
        height: false,
        weight: false
      });
    }
  }, [open, membershipPrices, trainers]);

  // Calculate total amount whenever membership type or access points change
  useEffect(() => {
    if (formState.membershipTypeId && formState.accessPoints > 0) {
      const selectedType = membershipPrices.find(p => p.id === formState.membershipTypeId);
      if (selectedType) {
        // Calculate based on points (assuming 30 points = full membership price)
        const pointCost = selectedType.basePrice / 30;
        setTotalAmount(Math.round(pointCost * formState.accessPoints * 100) / 100);
      }
    } else {
      setTotalAmount(0);
    }
  }, [formState.membershipTypeId, formState.accessPoints, membershipPrices]);

  // Handle text input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!name) return;

    setFormState(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field if any
    if (name in errors) {
      setErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  // Handle select input changes
  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    if (!name) return;

    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle gender select changes specifically
  const handleGenderChange = (e: SelectChangeEvent<"male" | "female" | "other">) => {
    const { name, value } = e.target;
    if (!name) return;

    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors = {
      name: !formState.name,
      email: !formState.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email),
      rfidCardNumber: !formState.rfidCardNumber,
      phone: formState.phone ? !/^[0-9+\- ]+$/.test(formState.phone.toString()) : false,
      age: formState.age ? parseInt(formState.age.toString()) <= 0 : false,
      height: formState.height ? parseInt(formState.height.toString()) <= 0 : false,
      weight: formState.weight ? parseInt(formState.weight.toString()) <= 0 : false
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  }, [formState]);

  // Handle form submission
  const handleCreateMember = async () => {
    if (!validateForm()) return;

    setIsCreatingMember(true);

    try {
      // Get selected membership type
      const selectedType = membershipPrices.find(p => p.id === formState.membershipTypeId);
      if (!selectedType) {
        showNotification('Tipo de membresía no válido', 'error');
        setIsCreatingMember(false);
        return;
      }

      // First register the payment transaction
      await axios.post('/api/transactions', {
        type: 'income',
        category: 'membership',
        amount: totalAmount,
        description: `Nueva membresía ${selectedType.name} con ${formState.accessPoints} puntos para ${formState.name}`,
        paymentMethod: formState.paymentMethod,
      });

      // Then create the member with RFID card
      const response = await axios.post('/api/rfid/create-member', {
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        gender: formState.gender,
        age: formState.age ? parseInt(formState.age.toString()) : undefined,
        rfidCardNumber: formState.rfidCardNumber,
        membershipType: formState.membershipTypeId,
        membershipStatus: 'active',
        accessPoints: formState.accessPoints,
        height: formState.height ? parseInt(formState.height.toString()) : undefined,
        weight: formState.weight ? parseInt(formState.weight.toString()) : undefined,
        goal: formState.goal,
        level: formState.level,
        trainer: formState.trainer
      });

      // Capture the generated PIN
      if (response.data && response.data.password) {
        onSuccess(formState.name, response.data.password);
      } else {
        onSuccess(formState.name, "");
      }
    } catch (error: any) {
      console.error('Error creating member:', error);
      showNotification(error.response?.data?.error || 'Error al crear miembro', 'error');
    } finally {
      setIsCreatingMember(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !isCreatingMember && onClose()}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ pb: 1 }}>
        Crear Nuevo Miembro
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          disabled={isCreatingMember}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 1 }}>
        {/* Personal Information Section */}
        <Typography variant="subtitle1" gutterBottom fontWeight="medium" sx={{ mt: 0 }}>
          Datos Personales
        </Typography>

        <Grid container spacing={1}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Nombre *"
              name="name"
              value={formState.name}
              onChange={handleInputChange}
              fullWidth
              error={errors.name}
              helperText={errors.name ? "El nombre es requerido" : ""}
              margin="dense"
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Email *"
              name="email"
              type="email"
              value={formState.email}
              onChange={handleInputChange}
              fullWidth
              error={errors.email}
              helperText={errors.email ? "Email inválido" : ""}
              margin="dense"
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Teléfono"
              name="phone"
              value={formState.phone}
              onChange={handleInputChange}
              fullWidth
              error={errors.phone}
              helperText={errors.phone ? "Formato inválido" : ""}
              margin="dense"
              size="small"
              inputProps={{
                inputMode: 'numeric',
                pattern: '[0-9]*'
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth margin="dense" size="small">
              <InputLabel>Género</InputLabel>
              <Select
                name="gender"
                value={formState.gender}
                onChange={handleGenderChange}
                label="Género"
              >
                <MenuItem value="male">Masculino</MenuItem>
                <MenuItem value="female">Femenino</MenuItem>
                <MenuItem value="other">Otro</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Edad"
              name="age"
              type="number"
              value={formState.age}
              onChange={handleInputChange}
              fullWidth
              error={errors.age}
              helperText={errors.age ? "Valor inválido" : ""}
              margin="dense"
              size="small"
              inputProps={{ min: 0 }}
            />
          </Grid>
        </Grid>

        {/* Physical Data Section */}
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            Datos Físicos
          </Typography>

          <Grid container spacing={1}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Altura (cm)"
                name="height"
                type="number"
                value={formState.height}
                onChange={handleInputChange}
                fullWidth
                error={errors.height}
                helperText={errors.height ? "Valor inválido" : ""}
                margin="dense"
                size="small"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Peso (kg)"
                name="weight"
                type="number"
                value={formState.weight}
                onChange={handleInputChange}
                fullWidth
                error={errors.weight}
                helperText={errors.weight ? "Valor inválido" : ""}
                margin="dense"
                size="small"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel>Nivel</InputLabel>
                <Select
                  name="level"
                  value={formState.level}
                  onChange={handleSelectChange}
                  label="Nivel"
                >
                  <MenuItem value="beginner">Principiante</MenuItem>
                  <MenuItem value="intermediate">Intermedio</MenuItem>
                  <MenuItem value="advanced">Avanzado</MenuItem>
                  <MenuItem value="expert">Experto</MenuItem>
                  <MenuItem value="professional">Profesional</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel>Objetivo</InputLabel>
                <Select
                  name="goal"
                  value={formState.goal}
                  onChange={handleSelectChange}
                  label="Objetivo"
                >
                  <MenuItem value="lose_weight">Perder Peso</MenuItem>
                  <MenuItem value="gain_weight">Ganar Peso</MenuItem>
                  <MenuItem value="get_fitter">Mejorar Estado Físico</MenuItem>
                  <MenuItem value="get_stronger">Aumentar Fuerza</MenuItem>
                  <MenuItem value="get_healthier">Mejorar Salud</MenuItem>
                  <MenuItem value="get_more_flexible">Mejorar Flexibilidad</MenuItem>
                  <MenuItem value="get_more_muscular">Aumentar Masa Muscular</MenuItem>
                  <MenuItem value="learn_the_basics">Aprender Fundamentos</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel>Entrenador</InputLabel>
                <Select
                  name="trainer"
                  value={formState.trainer}
                  onChange={handleSelectChange}
                  label="Entrenador"
                >
                  {trainers.map(trainer => (
                    <MenuItem key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {/* Membership Data Section */}
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            Datos de Membresía
          </Typography>

          <Grid container spacing={1}>
            <Grid item xs={12}>
              <TextField
                label="Número de Tarjeta RFID *"
                name="rfidCardNumber"
                value={formState.rfidCardNumber}
                onChange={handleInputChange}
                fullWidth
                error={errors.rfidCardNumber}
                helperText={errors.rfidCardNumber ? "Número de tarjeta requerido" : ""}
                margin="dense"
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel>Tipo de Membresía</InputLabel>
                <Select
                  name="membershipTypeId"
                  value={formState.membershipTypeId}
                  onChange={handleSelectChange}
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
              <TextField
                label="Puntos iniciales"
                name="accessPoints"
                type="number"
                value={formState.accessPoints}
                onChange={handleInputChange}
                fullWidth
                margin="dense"
                size="small"
                inputProps={{ min: 1 }}
                helperText={`30 puntos = ${formState.membershipTypeId ? 
                  '$' + (membershipPrices.find(p => p.id === formState.membershipTypeId)?.basePrice || 0) 
                  : 'precio completo'}`}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel>Método de Pago</InputLabel>
                <Select
                  name="paymentMethod"
                  value={formState.paymentMethod}
                  onChange={handleSelectChange}
                  label="Método de Pago"
                >
                  <MenuItem value="cash">Efectivo</MenuItem>
                  <MenuItem value="card">Tarjeta</MenuItem>
                  <MenuItem value="transfer">Transferencia</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Payment Summary */}
          <Card variant="outlined" sx={{ mt: 1, bgcolor: 'primary.50' }}>
            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={6}>
                  <Typography variant="subtitle2">
                    Total a pagar:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6" color="primary.main" fontWeight="bold">
                    ${totalAmount}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          disabled={isCreatingMember}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleCreateMember}
          disabled={isCreatingMember}
          startIcon={isCreatingMember ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isCreatingMember ? "Creando..." : "Crear Miembro"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}