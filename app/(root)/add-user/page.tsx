"use client";

import axios from "axios";
import toast from "react-hot-toast";
import Grid from "@mui/material/Grid";
import { LoadingButton } from "@mui/lab";
import Container from "@mui/material/Container";
import TextField from "@mui/material/TextField";
import { 
  Box, 
  CssBaseline, 
  MenuItem, 
  Select, 
  FormControl, 
  InputLabel, 
  Typography, 
  Paper,
  Avatar,
  Divider,
  FormHelperText,
  IconButton,
  CircularProgress,
  Alert,
  Grow,
} from "@mui/material/";
import { Person, Badge, Spa, SportsTennis, Visibility, VisibilityOff, CheckCircle, Store } from "@mui/icons-material";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

const AddMemberPage: React.FC = () => {
  const { data } = useSession();
  const sessionUser = data?.user;
  const [selectedRole, setSelectedRole] = useState<string>("trainer");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userCreated, setUserCreated] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    setValue,
    reset,
    watch,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FieldValues>({
    defaultValues: {
      role: "trainer",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      gender: "male",
      phone: "",
      post: "",
      age: 30,
      weight: 70,
      height: 170,
      goal: "get_fitter",
      level: "beginner",
    },
  });

  const roleValue = watch("role");
  const showPostSelector = roleValue === "receptionist" || roleValue === "court_manager";

  useEffect(() => {
    setSelectedRole(roleValue);
    
    if (roleValue !== "receptionist" && roleValue !== "court_manager") {
      setValue("post", "");
    }
  }, [roleValue, setValue]);

  useEffect(() => {
    if (userCreated) {
      const timer = setTimeout(() => {
        setUserCreated(false);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [userCreated]);

  useEffect(() => {
    if (emailError) {
      setEmailError(null);
      clearErrors("email");
    }
  }, [watch('email'), clearErrors]);

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      setEmailError(null);
      setSuccessMessage(null);
      setFormError(null);
      
      const userData: any = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        gender: data.gender,
        phone: parseInt(data.phone) || 0,
      };

      if ((data.role === "receptionist" || data.role === "court_manager") && data.post) {
        userData.post = data.post;
      } else if ((data.role === "receptionist" || data.role === "court_manager") && !data.post) {
        setFormError("El puesto es requerido para recepcionistas y administradores de canchas");
        setError("post", {
          type: "manual",
          message: "El puesto es requerido"
        });
        return;
      }

      if (sessionUser?.role === userData.role) {
        toast.error(`No puedes crear un ${userData.role} siendo ${sessionUser?.role}`);
        return;
      }

      const res = await axios.post("/api/create-user", userData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.data && res.data.success) {
        const roleText = selectedRole === "trainer" ? "entrenador" : 
                         selectedRole === "receptionist" ? "recepcionista" : 
                         selectedRole === "court_manager" ? "administrador de canchas" : selectedRole;
        
        setSuccessMessage(`${capitalizeFirstLetter(roleText)} creado exitosamente`);
        setUserCreated(true);
        
        toast.success(`${capitalizeFirstLetter(roleText)} creado exitosamente`, {
          duration: 5000,
          icon: '✅',
          style: {
            background: '#ECFDF5',
            color: '#065F46',
            border: '1px solid #10B981'
          }
        });
        
        reset();
      }
    } catch (err: any) {
      console.error("Error:", err);
      
      if (err.response) {
        if (err.response.status === 409) {
          const errorMsg = "Este correo electrónico ya está registrado";
          setEmailError(errorMsg);
          setError("email", {
            type: "manual",
            message: errorMsg
          });
          
          toast.error(errorMsg, {
            duration: 4000,
            icon: '❌',
          });
        } else {
          let errorMessage = "Error al crear usuario";
          
          if (err.response.data && err.response.data.error) {
            errorMessage = err.response.data.error;
          }
          
          setFormError(errorMessage);
          toast.error(errorMessage, { duration: 4000 });
        }
      } else if (err.message) {
        setFormError(err.message);
        toast.error(err.message, { duration: 4000 });
      }
    }
  };

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const getRoleIcon = () => {
    if (selectedRole === "trainer") return <Spa fontSize="large" color="primary" />;
    if (selectedRole === "receptionist") return <Badge fontSize="large" color="secondary" />;
    if (selectedRole === "court_manager") return <SportsTennis fontSize="large" style={{ color: "green" }} />;
    return <Person fontSize="large" color="primary" />;
  };

  const getRoleText = () => {
    return selectedRole === "trainer" ? "entrenador" : 
           selectedRole === "receptionist" ? "recepcionista" : 
           selectedRole === "court_manager" ? "administrador de canchas" : 
           capitalizeFirstLetter(selectedRole);
  };

  return (
    <Container component="main" maxWidth="sm">
      <CssBaseline />
      <Paper 
        elevation={3} 
        sx={{ 
          p: { xs: 2, sm: 4 }, 
          mt: { xs: 2, sm: 8 }, 
          borderRadius: 2,
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center' 
        }}
      >
        <Avatar sx={{ 
          bgcolor: selectedRole === 'trainer' ? 'primary.main' : selectedRole === 'receptionist' ? 'secondary.main' : selectedRole === 'court_manager' ? 'success.main' : 'primary.main',
          width: 56, 
          height: 56, 
          mb: 2 
        }}>
          {getRoleIcon()}
        </Avatar>
        <Typography component="h1" variant="h4" sx={{ mb: 1, fontWeight: 500, textAlign: 'center' }}>
          Añadir {getRoleText()}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Completa el formulario para crear una nueva cuenta de {getRoleText()}
        </Typography>

        <Divider sx={{ width: '100%', mb: 3 }} />

        {formError && (
          <Grow in={!!formError}>
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {formError}
            </Alert>
          </Grow>
        )}

        {successMessage && userCreated && (
          <Grow in={!!successMessage}>
            <Alert 
              severity="success" 
              sx={{ width: '100%', mb: 2 }}
              icon={<CheckCircle fontSize="inherit" />}
            >
              {successMessage}
            </Alert>
          </Grow>
        )}

        <Box
          component="form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          sx={{ width: '100%' }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                type="text"
                autoComplete="name"
                required
                fullWidth
                id="name"
                label="Nombre completo"
                autoFocus
                InputProps={{
                  startAdornment: <Person sx={{ color: 'text.secondary', mr: 1 }} fontSize="small" />,
                }}
                {...register("name", { required: "El nombre es requerido" })}
                helperText={errors.name?.message as string || null}
                error={!!errors?.name?.message}
                onChange={() => setFormError(null)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors?.role?.message}>
                <InputLabel id="role-select-label">Rol</InputLabel>
                <Select
                  labelId="role-select-label"
                  id="role-select"
                  label="Rol"
                  value={selectedRole}
                  onChange={(e) => {
                    setValue("role", e.target.value);
                    setSelectedRole(e.target.value);
                    setFormError(null);
                  }}
                >
                  <MenuItem value="trainer">Entrenador</MenuItem>
                  <MenuItem value="receptionist">Recepcionista</MenuItem>
                  <MenuItem value="court_manager">Administrador de canchas</MenuItem>
                </Select>
                {errors.role && (
                  <FormHelperText>{errors.role.message as string}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            {showPostSelector && (
              <Grid item xs={12}>
                <FormControl fullWidth error={!!errors?.post?.message}>
                  <InputLabel id="post-select-label">Puesto de venta</InputLabel>
                  <Select
                    labelId="post-select-label"
                    id="post-select"
                    label="Puesto de venta"
                    defaultValue=""
                    startAdornment={<Store sx={{ color: 'text.secondary', mr: 1 }} fontSize="small" />}
                    {...register("post", { 
                      required: showPostSelector ? "El puesto de venta es requerido" : false 
                    })}
                    onChange={() => {
                      setFormError(null);
                      if (errors.post) clearErrors("post");
                    }}
                  >
                    <MenuItem value="">Seleccionar puesto</MenuItem>
                    <MenuItem value="post_1">Puesto 1</MenuItem>
                    <MenuItem value="post_2">Puesto 2</MenuItem>
                  </Select>
                  {errors.post && (
                    <FormHelperText>{errors.post.message as string}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                type="email"
                autoComplete="email"
                required
                fullWidth
                id="email"
                label="Correo electrónico"
                error={!!errors?.email?.message || !!emailError}
                helperText={(errors.email?.message as string) || emailError}
                {...register("email", {
                  required: "El correo electrónico es requerido",
                  pattern: {
                    value: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/,
                    message: "Correo electrónico inválido",
                  },
                })}
                onChange={() => {
                  if (emailError) setEmailError(null);
                  setFormError(null);
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                type="tel"
                autoComplete="tel"
                required
                fullWidth
                id="phone"
                label="Número de teléfono"
                error={!!errors?.phone?.message}
                helperText={errors.phone?.message as string || null}
                {...register("phone", {
                  required: "El número de teléfono es requerido",
                  pattern: {
                    value: /^[0-9]+$/,
                    message: "El teléfono debe ser un número",
                  }
                })}
                onChange={() => setFormError(null)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                type={showPassword ? "text" : "password"}
                required
                fullWidth
                id="password"
                label="Contraseña"
                error={!!errors?.password?.message}
                helperText={errors.password?.message as string || null}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
                {...register("password", {
                  required: "La contraseña es requerida",
                  minLength: {
                    value: 8,
                    message: "La contraseña debe tener al menos 8 caracteres",
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,20}$/,
                    message:
                      "La contraseña debe contener al menos una letra mayúscula, una minúscula y un número",
                  },
                })}
                onChange={() => setFormError(null)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                type={showConfirmPassword ? "text" : "password"}
                required
                fullWidth
                id="confirmPassword"
                label="Confirmar Contraseña"
                error={!!errors?.confirmPassword?.message}
                helperText={errors.confirmPassword?.message as string || null}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
                {...register("confirmPassword", {
                  required: "Por favor confirma la contraseña",
                  validate: (val: string) => {
                    if (watch('password') != val) {
                      return "Las contraseñas no coinciden";
                    }
                  }
                })}
                onChange={() => setFormError(null)}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="gender-select-label">Género</InputLabel>
                <Select
                  labelId="gender-select-label"
                  id="gender-select"
                  label="Género"
                  defaultValue="male"
                  {...register("gender", {
                    required: true,
                  })}
                  onChange={() => setFormError(null)}
                >
                  <MenuItem value="male">Masculino</MenuItem>
                  <MenuItem value="female">Femenino</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          {userCreated ? (
            <LoadingButton
              variant="contained"
              fullWidth
              color="success"
              startIcon={<CheckCircle />}
              sx={{ 
                mt: 4, 
                mb: 2, 
                py: 1.5,
                fontSize: '1rem',
                backgroundColor: '#4caf50',
                whiteSpace: 'nowrap',
                minHeight: '56px'
              }}
            >
              Usuario creado exitosamente
            </LoadingButton>
          ) : (
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingIndicator={
                <Box display="flex" alignItems="center">
                  <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                  <span>Creando {getRoleText()}...</span>
                </Box>
              }
              variant="contained"
              fullWidth
              color={formError ? "error" : selectedRole === 'trainer' ? 'primary' : selectedRole === "receptionist" ? 'secondary' : selectedRole === "court_manager" ? 'success' : 'primary'}
              sx={{ 
                mt: 4, 
                mb: 2, 
                py: 1.5,
                fontSize: '1rem',
                whiteSpace: 'nowrap',
                minHeight: '56px'
              }}
            >
              Crear {capitalizeFirstLetter(getRoleText())}
            </LoadingButton>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default AddMemberPage;