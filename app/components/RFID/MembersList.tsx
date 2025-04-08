// app/components/RFIDMembersList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, CircularProgress, FormControl, InputLabel, Select,
  MenuItem, Chip, IconButton, Grid, Autocomplete
} from '@mui/material';
import { Edit, Add, Badge, FitnessCenter, Info } from '@mui/icons-material';
import { format, addMonths } from 'date-fns';
import axios from 'axios';

const RFIDMembersList = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState('');

  // Basic info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('');
  
  // Membership data
  const [rfidCardNumber, setRfidCardNumber] = useState('');
  const [membershipType, setMembershipType] = useState('standard');
  const [membershipStatus, setMembershipStatus] = useState('active');
  const [membershipMonths, setMembershipMonths] = useState(1);
  const [membershipExpiry, setMembershipExpiry] = useState(
    format(addMonths(new Date(), 1), 'yyyy-MM-dd')
  );
  
  // Physical data
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('lose_weight');
  const [level, setLevel] = useState('beginner');
  
  // Additional info
  const [medicalConditions, setMedicalConditions] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [notes, setNotes] = useState('');

  // Active section
  const [activeSection, setActiveSection] = useState('basic');

  useEffect(() => {
    fetchMembers();
  }, []);

  // Auto-update expiry date when months change
  useEffect(() => {
    const newExpiryDate = addMonths(new Date(), membershipMonths);
    setMembershipExpiry(format(newExpiryDate, 'yyyy-MM-dd'));
  }, [membershipMonths]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/members');
      setMembers(response.data.members || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setSelectedUser(user);
      // Basic info
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone?.toString() || '');
      setGender(user.gender || 'male');
      setAge(user.age?.toString() || '');
      
      // Membership data
      setRfidCardNumber(user.rfidCardNumber || '');
      setMembershipType(user.membershipType || 'standard');
      setMembershipStatus(user.membershipStatus || 'active');
      
      // Calculate months from expiry date
      if (user.membershipExpiry) {
        const today = new Date();
        const expiryDate = new Date(user.membershipExpiry);
        const diffMonths = (expiryDate.getFullYear() - today.getFullYear()) * 12 + 
                          (expiryDate.getMonth() - today.getMonth());
        setMembershipMonths(Math.max(1, Math.min(6, diffMonths)));
        setMembershipExpiry(format(expiryDate, 'yyyy-MM-dd'));
      } else {
        setMembershipMonths(1);
        setMembershipExpiry(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
      }
      
      // Physical data
      setHeight(user.height?.toString() || '');
      setWeight(user.weight?.toString() || '');
      setGoal(user.goal || 'lose_weight');
      setLevel(user.level || 'beginner');
      setNotes(user.notes || '');
    } else {
      setSelectedUser(null);
      // Reset all fields
      setName('');
      setEmail('');
      setPhone('');
      setGender('male');
      setAge('');
      
      setRfidCardNumber('');
      setMembershipType('standard');
      setMembershipStatus('active');
      setMembershipMonths(1);
      setMembershipExpiry(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
      
      setHeight('');
      setWeight('');
      setGoal('lose_weight');
      setLevel('beginner');
      
      setMedicalConditions('');
      setEmergencyContact('');
      setEmergencyPhone('');
      setDietaryRestrictions([]);
      setNotes('');
    }
    
    setActiveSection('basic');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    try {
      if (selectedUser) {
        // Update existing member
        await axios.post('/api/rfid/assign', {
          userId: selectedUser.id,
          rfidCardNumber,
          membershipType,
          membershipStatus,
          membershipExpiry,
          // Add physical data
          height: height ? parseInt(height) : undefined,
          weight: weight ? parseInt(weight) : undefined,
          goal,
          level,
          notes
        });
      } else {
        // Create new member with RFID
        await axios.post('/api/rfid/create-member', {
          // Basic info
          name,
          email,
          phone,
          gender,
          age: age ? parseInt(age) : undefined,
          
          // Membership data
          rfidCardNumber,
          membershipType,
          membershipStatus,
          membershipExpiry,
          
          // Physical data
          height: height ? parseInt(height) : undefined,
          weight: weight ? parseInt(weight) : undefined,
          goal,
          level,
          
          // Additional info
          medicalConditions,
          emergencyContact: emergencyContact ? {
            name: emergencyContact,
            phone: emergencyPhone,
            relationship: 'contact',
            isEmergencyContact: true
          } : undefined,
          dietaryRestrictions,
          notes
        });
      }
      
      handleClose();
      fetchMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      alert(error.response?.data?.error || 'Error al guardar miembro');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'expired': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const filteredMembers = members.filter(member => 
    member.name?.toLowerCase().includes(search.toLowerCase()) ||
    member.email?.toLowerCase().includes(search.toLowerCase()) ||
    member.rfidCardNumber?.includes(search)
  );

  const dietaryOptions = [
    'Vegetariano', 'Vegano', 'Sin gluten', 'Sin lactosa', 
    'Sin frutos secos', 'Sin mariscos', 'Keto', 'Paleo'
  ];

  // Calculate days until expiration for each member
  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Membresías RFID</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Buscar"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Nuevo Miembro
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Tarjeta RFID</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Expiración</TableCell>
                <TableCell>Días Restantes</TableCell>
                <TableCell>Último Acceso</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => {
                  const daysLeft = getDaysUntilExpiry(member.membershipExpiry);
                  let daysLeftColor = 'inherit';
                  if (daysLeft !== null) {
                    if (daysLeft < 0) daysLeftColor = 'error.main';
                    else if (daysLeft < 7) daysLeftColor = 'warning.main';
                    else if (daysLeft < 15) daysLeftColor = 'info.main';
                  }
                  
                  return (
                    <TableRow key={member.id}>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>{member.rfidCardNumber}</TableCell>
                      <TableCell>{member.membershipType || 'Estándar'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={member.membershipStatus} 
                          size="small"
                          color={getStatusColor(member.membershipStatus)}
                        />
                      </TableCell>
                      <TableCell>
                        {member.membershipExpiry 
                          ? format(new Date(member.membershipExpiry), 'dd/MM/yyyy')
                          : 'No definida'}
                      </TableCell>
                      <TableCell sx={{ color: daysLeftColor }}>
                        {daysLeft !== null 
                          ? daysLeft < 0 
                            ? `Vencido (${Math.abs(daysLeft)} días)` 
                            : `${daysLeft} días` 
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {member.lastCheckIn 
                          ? format(new Date(member.lastCheckIn), 'dd/MM/yyyy HH:mm')
                          : 'Nunca'}
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenDialog(member)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No se encontraron miembros con tarjetas RFID
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedUser ? 'Editar Membresía' : 'Crear Nuevo Miembro'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Button 
              startIcon={<Badge />}
              onClick={() => setActiveSection('basic')}
              color={activeSection === 'basic' ? 'primary' : 'inherit'}
              sx={{ fontWeight: activeSection === 'basic' ? 'bold' : 'normal' }}
            >
              Datos Básicos
            </Button>
            <Button 
              startIcon={<FitnessCenter />}
              onClick={() => setActiveSection('physical')}
              color={activeSection === 'physical' ? 'primary' : 'inherit'}
              sx={{ fontWeight: activeSection === 'physical' ? 'bold' : 'normal' }}
            >
              Datos Físicos
            </Button>
            <Button 
              startIcon={<Info />}
              onClick={() => setActiveSection('additional')}
              color={activeSection === 'additional' ? 'primary' : 'inherit'}
              sx={{ fontWeight: activeSection === 'additional' ? 'bold' : 'normal' }}
            >
              Información Adicional
            </Button>
          </Box>
          
          {/* Basic Information Section */}
          {activeSection === 'basic' && (
            <Grid container spacing={2}>
              {!selectedUser && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nombre"
                      fullWidth
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Email"
                      type="email"
                      fullWidth
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Teléfono"
                      fullWidth
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel>Género</InputLabel>
                      <Select
                        value={gender}
                        label="Género"
                        onChange={(e) => setGender(e.target.value)}
                      >
                        <MenuItem value="male">Masculino</MenuItem>
                        <MenuItem value="female">Femenino</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField
                      label="Edad"
                      type="number"
                      fullWidth
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </Grid>
                </>
              )}
              
              <Grid item xs={12}>
                <TextField
                  label="Número de Tarjeta RFID"
                  fullWidth
                  required
                  value={rfidCardNumber}
                  onChange={(e) => setRfidCardNumber(e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Membresía</InputLabel>
                  <Select
                    value={membershipType}
                    label="Tipo de Membresía"
                    onChange={(e) => setMembershipType(e.target.value)}
                  >
                    <MenuItem value="standard">Estándar</MenuItem>
                    <MenuItem value="premium">Premium</MenuItem>
                    <MenuItem value="vip">VIP</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Duración (meses)</InputLabel>
                  <Select
                    value={membershipMonths}
                    label="Duración (meses)"
                    onChange={(e) => setMembershipMonths(e.target.value)}
                  >
                    <MenuItem value={1}>1 mes</MenuItem>
                    <MenuItem value={2}>2 meses</MenuItem>
                    <MenuItem value={3}>3 meses</MenuItem>
                    <MenuItem value={4}>4 meses</MenuItem>
                    <MenuItem value={5}>5 meses</MenuItem>
                    <MenuItem value={6}>6 meses</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Estado de Pago</InputLabel>
                  <Select
                    value={membershipStatus}
                    label="Estado de Pago"
                    onChange={(e) => setMembershipStatus(e.target.value)}
                  >
                    <MenuItem value="active">Pagado</MenuItem>
                    <MenuItem value="pending">Pago Pendiente</MenuItem>
                    <MenuItem value="expired">Expirado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Fecha de Expiración"
                  type="date"
                  fullWidth
                  disabled
                  value={membershipExpiry}
                  InputLabelProps={{ shrink: true }}
                  helperText={`La membresía expirará el ${format(new Date(membershipExpiry), 'dd/MM/yyyy')}`}
                />
              </Grid>
            </Grid>
          )}
          
          {/* Physical Data Section */}
          {activeSection === 'physical' && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Altura (cm)"
                  type="number"
                  fullWidth
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Peso (kg)"
                  type="number"
                  fullWidth
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Objetivo</InputLabel>
                  <Select
                    value={goal}
                    label="Objetivo"
                    onChange={(e) => setGoal(e.target.value)}
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
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Nivel</InputLabel>
                  <Select
                    value={level}
                    label="Nivel"
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <MenuItem value="beginner">Principiante</MenuItem>
                    <MenuItem value="intermediate">Intermedio</MenuItem>
                    <MenuItem value="advanced">Avanzado</MenuItem>
                    <MenuItem value="expert">Experto</MenuItem>
                    <MenuItem value="professional">Profesional</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
          
          {/* Additional Information Section */}
          {activeSection === 'additional' && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Condiciones Médicas"
                  fullWidth
                  multiline
                  rows={2}
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  placeholder="Alergias, condiciones, medicamentos, etc."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Contacto de Emergencia"
                  fullWidth
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Teléfono de Emergencia"
                  fullWidth
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={dietaryOptions}
                  value={dietaryRestrictions}
                  onChange={(e, newValue) => setDietaryRestrictions(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Restricciones Alimenticias"
                      placeholder="Seleccionar"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notas Adicionales"
                  fullWidth
                  multiline
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Información adicional relevante"
                />
              </Grid>
            </Grid>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 1 }}>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleSave}
            >
              Guardar
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default RFIDMembersList;