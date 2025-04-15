import React, { useState, useEffect } from 'react';
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
  Divider,
  SelectChangeEvent
} from '@mui/material';
import { Close, Key } from '@mui/icons-material';
import { Member, MembershipPrice, Trainer, FormState, FormErrors } from '@/app/types/membership';

interface EditMemberModalProps {
  open: boolean;
  onClose: () => void;
  member: Member | null;
  membershipPrices: MembershipPrice[];
  trainers: Trainer[];
  onSuccess: () => void;
  showNotification: (message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void;
  onResetPassword: (member: Member) => void;
}

export default function EditMemberModal({
  open,
  onClose,
  member,
  membershipPrices,
  trainers,
  onSuccess,
  showNotification,
  onResetPassword
}: EditMemberModalProps) {
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
    accessPoints: 0,
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

  // Initialize form with member data when modal opens or member changes
  useEffect(() => {
    if (member) {
      setFormState({
        name: member.name || '',
        email: member.email || '',
        phone: member.phone?.toString() || '',
        gender: member.gender || 'male',
        age: member.age?.toString() || '',
        rfidCardNumber: member.rfidCardNumber || '',
        membershipTypeId: member.membershipType || membershipPrices[0]?.id || '',
        membershipStatus: member.membershipStatus || 'active',
        accessPoints: member.accessPoints || 0,
        paymentMethod: 'cash',
        height: member.height?.toString() || '',
        weight: member.weight?.toString() || '',
        goal: member.goal || 'lose_weight',
        level: member.level || 'beginner',
        trainer: member.trainer || ''
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
  }, [member, membershipPrices]);

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

  // Handle form submission
  const handleEditMember = async () => {
    if (!member) return;

    // Validate required fields
    if (!formState.rfidCardNumber) {
      setErrors(prev => ({
        ...prev,
        rfidCardNumber: true
      }));
      return;
    }

    try {
      await axios.post('/api/rfid/assign', {
        userId: member.id,
        rfidCardNumber: formState.rfidCardNumber,
        membershipType: formState.membershipTypeId,
        membershipStatus: member.membershipStatus,
        accessPoints: member.accessPoints,
        phone: formState.phone,
        gender: formState.gender,
        age: formState.age ? parseInt(formState.age.toString()) : undefined,
        height: formState.height ? parseInt(formState.height.toString()) : undefined,
        weight: formState.weight ? parseInt(formState.weight.toString()) : undefined,
        goal: formState.goal,
        level: formState.level,
        trainer: formState.trainer
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error updating member:', error);
      showNotification(error.response?.data?.error || 'Error al actualizar miembro', 'error');
    }
  };

  // Get membership status
  const getMembershipStatus = (member: Member): string => {
    if (!member.accessPoints && member.accessPoints !== 0) {
      return 'Indefinido';
    }

    if (member.accessPoints <= 0) {
      return 'Sin puntos';
    }

    if (member.accessPoints <= 5) {
      return 'Pocos puntos';
    }

    return 'Activo';
  };

  // Handle password reset
  const handleResetPassword = () => {
    if (member) {
      onResetPassword(member);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Editar Miembro
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
          <>
            {/* Basic Information (Read-only) */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                Información Básica
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Nombre"
                    value={member.name}
                    disabled
                    fullWidth
                    size="small"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Email"
                    value={member.email}
                    disabled
                    fullWidth
                    size="small"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Membership Information (Read-only) */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                Datos de Membresía
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Tipo de Membresía"
                    value={membershipPrices.find(p => p.id === member.membershipType)?.name || member.membershipType || 'No definido'}
                    disabled
                    fullWidth
                    size="small"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Estado"
                    value={getMembershipStatus(member)}
                    disabled
                    fullWidth
                    size="small"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Puntos disponibles"
                    value={member.accessPoints || 0}
                    disabled
                    fullWidth
                    size="small"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Editable Information */}
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Datos Actualizables
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Número de Tarjeta RFID *"
                  name="rfidCardNumber"
                  value={formState.rfidCardNumber}
                  onChange={handleInputChange}
                  fullWidth
                  error={errors.rfidCardNumber}
                  helperText={errors.rfidCardNumber ? "Número de tarjeta requerido" : ""}
                  margin="normal"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" size="small">
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
              <Grid item xs={12} md={4}>
                <TextField
                  label="Teléfono"
                  name="phone"
                  value={formState.phone}
                  onChange={handleInputChange}
                  fullWidth
                  error={errors.phone}
                  helperText={errors.phone ? "Formato inválido" : ""}
                  margin="normal"
                  size="small"
                  inputProps={{
                    inputMode: 'numeric',
                    pattern: '[0-9]*'
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="normal" size="small">
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
                  margin="normal"
                  size="small"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Altura (cm)"
                  name="height"
                  type="number"
                  value={formState.height}
                  onChange={handleInputChange}
                  fullWidth
                  error={errors.height}
                  helperText={errors.height ? "Valor inválido" : ""}
                  margin="normal"
                  size="small"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Peso (kg)"
                  name="weight"
                  type="number"
                  value={formState.weight}
                  onChange={handleInputChange}
                  fullWidth
                  error={errors.weight}
                  helperText={errors.weight ? "Valor inválido" : ""}
                  margin="normal"
                  size="small"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth margin="normal" size="small">
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
              <Grid item xs={12} md={3}>
                <FormControl fullWidth margin="normal" size="small">
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
            </Grid>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{marginX: 2}}>
        <Button
          startIcon={<Key />}
          color="primary"
          variant="outlined"
          onClick={handleResetPassword}
          sx={{ marginRight: 'auto' }}  // Empuja los siguientes elementos hacia la derecha
        >
          Nueva Contraseña
        </Button>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleEditMember}
        >
          Guardar Cambios
        </Button>
      </DialogActions>

    </Dialog>
  );
}