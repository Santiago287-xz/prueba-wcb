"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Grid from "@mui/material/Grid";
import { LoadingButton } from "@mui/lab";
import Container from "@mui/material/Container";
import TextField from "@mui/material/TextField";
import { createTheme, ThemeProvider } from "@mui/material/styles";
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
  FormHelperText 
} from "@mui/material/";
import { Person, Badge, Spa } from "@mui/icons-material";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { SessionUser } from "@/types";
import { useState, useEffect } from "react";

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
  },
  components: {
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiFormControl: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

const AddMemberPage: React.FC = () => {
  const { data } = useSession();
  const sessionUser = data?.user as SessionUser;
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string>("trainer");

  const {
    register,
    setValue,
    reset,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FieldValues>({
    defaultValues: {
      role: "trainer",
      name: "",
      email: "",
      password: "",
      gender: "male",
      phone: "",
      age: 30,
      weight: 70,
      height: 170,
      goal: "get_fitter",
      level: "beginner",
    },
  });

  // Watch the role field to update UI based on selection
  const roleValue = watch("role");

  useEffect(() => {
    setSelectedRole(roleValue);
  }, [roleValue]);

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      console.log("Datos a enviar:", data);
      
      // Datos mínimos necesarios (versión simplificada)
      const userData = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        gender: data.gender,
        phone: parseInt(data.phone) || 0,
      };
      
      console.log("Datos procesados:", userData);
      
      // Verificamos si hay conflicto de roles
      if (sessionUser?.role === userData.role) {
        toast.error(`No puedes crear un ${userData.role} siendo ${sessionUser?.role}`);
        return;
      }
      
      const res = await axios.post("/api/users", userData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Respuesta del servidor:", res.data);

      if (res.data) {
        toast.success(`${capitalizeFirstLetter(selectedRole)} creado exitosamente`);
        reset();
        
        // Redirect based on role
        if (selectedRole === "trainer") {
          router.push("/trainers");
        } else if (selectedRole === "receptionist") {
          router.push("/dashboard");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: Error | any) {
      console.error("Error completo:", err);
      
      // Mostramos todos los detalles del error para depuración
      console.log("Error response:", err.response);
      console.log("Error message:", err.message);
      
      if (err.response?.data) {
        console.log("Server error data:", err.response.data);
      }
      
      // Intentar obtener un mensaje de error más detallado
      let errorMessage = "Error al crear usuario";
      
      if (err.response) {
        if (err.response.data && err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.statusText) {
          errorMessage = `Error: ${err.response.statusText}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const getRoleIcon = () => {
    if (selectedRole === "trainer") return <Spa fontSize="large" color="primary" />;
    if (selectedRole === "receptionist") return <Badge fontSize="large" color="secondary" />;
    return <Person fontSize="large" color="primary" />;
  };

  return (
    <ThemeProvider theme={theme}>
      <Container component="main" maxWidth="sm">
        <CssBaseline />
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            mt: 8, 
            borderRadius: 2,
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center' 
          }}
        >
          <Avatar sx={{ 
            bgcolor: selectedRole === 'trainer' ? 'primary.main' : 'secondary.main', 
            width: 56, 
            height: 56, 
            mb: 2 
          }}>
            {getRoleIcon()}
          </Avatar>
          <Typography component="h1" variant="h4" sx={{ mb: 1, fontWeight: 500 }}>
            Añadir nuevo { 
              selectedRole === "trainer" ? "Entrenador" : 
              selectedRole === "receptionist" ? "Recepcionista" : capitalizeFirstLetter(selectedRole)
            }
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Completa el formulario para crear una nueva cuenta de {
              selectedRole === "trainer" ? "entrenador" : "recepcionista"
            }
          </Typography>

          <Divider sx={{ width: '100%', mb: 3 }} />

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
                  helperText={
                    errors.name && typeof errors.name.message === "string"
                      ? errors.name.message
                      : null
                  }
                  error={!!errors?.name?.message}
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
                    }}
                  >
                    <MenuItem value="trainer">Entrenador</MenuItem>
                    <MenuItem value="receptionist">Recepcionista</MenuItem>
                  </Select>
                  {errors.role && typeof errors.role.message === "string" && (
                    <FormHelperText>{errors.role.message}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  type="email"
                  autoComplete="email"
                  required
                  fullWidth
                  id="email"
                  label="Correo electrónico"
                  error={!!errors?.email?.message}
                  helperText={
                    errors.email && typeof errors.email.message === "string"
                      ? errors.email.message
                      : null
                  }
                  {...register("email", {
                    required: "El correo electrónico es requerido",
                    pattern: {
                      value: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/,
                      message: "Correo electrónico inválido",
                    },
                  })}
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
                  helperText={
                    errors.phone && typeof errors.phone.message === "string"
                      ? errors.phone.message
                      : null
                  }
                  {...register("phone", {
                    required: "El número de teléfono es requerido",
                    pattern: {
                      value: /^[0-9]+$/,
                      message: "El teléfono debe ser un número",
                    }
                  })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  type="password"
                  required
                  fullWidth
                  id="password"
                  label="Contraseña"
                  error={!!errors?.password?.message}
                  helperText={
                    errors.password && typeof errors.password.message === "string"
                      ? errors.password.message
                      : null
                  }
                  {...register("password", {
                    required: "La contraseña es requerida",
                    minLength: {
                      value: 8,
                      message: "La contraseña debe tener al menos 8 caracteres",
                    },
                    maxLength: {
                      value: 20,
                      message: "La contraseña debe tener máximo 20 caracteres",
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,20}$/,
                      message:
                        "La contraseña debe contener al menos una letra mayúscula, una minúscula y un número",
                    },
                  })}
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
                  >
                    <MenuItem value="male">Masculino</MenuItem>
                    <MenuItem value="female">Femenino</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingIndicator={`Creando ${selectedRole === "trainer" ? "entrenador" : "recepcionista"}...`}
              variant="contained"
              fullWidth
              color={selectedRole === 'trainer' ? 'primary' : 'secondary'}
              sx={{ 
                mt: 4, 
                mb: 2, 
                py: 1.5,
                fontSize: '1rem'
              }}
            >
              Crear {selectedRole === "trainer" ? "Entrenador" : "Recepcionista"}
            </LoadingButton>
            
            {process.env.NODE_ENV === 'development' && (
              <Box mt={2}>
                <Typography variant="caption" color="text.secondary" align="center" display="block" gutterBottom>
                  Opciones de depuración (solo en desarrollo)
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <LoadingButton
                      variant="outlined"
                      size="small"
                      fullWidth
                      onClick={() => {
                        // Datos de prueba para entrenador
                        setValue("name", "Entrenador Prueba");
                        setValue("email", `trainer-${Date.now()}@example.com`);
                        setValue("password", "Password123");
                        setValue("phone", "1234567890");
                        setValue("gender", "male");
                        setValue("role", "trainer");
                        setSelectedRole("trainer");
                        
                        console.log("Formulario con datos de prueba:", watch());
                      }}
                    >
                      Datos de entrenador
                    </LoadingButton>
                  </Grid>
                  <Grid item xs={6}>
                    <LoadingButton
                      variant="outlined"
                      size="small"
                      fullWidth
                      color="secondary"
                      onClick={() => {
                        // Datos de prueba para recepcionista
                        setValue("name", "Recepcionista Prueba");
                        setValue("email", `receptionist-${Date.now()}@example.com`);
                        setValue("password", "Password123");
                        setValue("phone", "9876543210");
                        setValue("gender", "female");
                        setValue("role", "receptionist");
                        setSelectedRole("receptionist");
                        
                        console.log("Formulario con datos de prueba:", watch());
                      }}
                    >
                      Datos de recepcionista
                    </LoadingButton>
                  </Grid>
                  <Grid item xs={12}>
                    <LoadingButton
                      variant="outlined"
                      size="small"
                      fullWidth
                      color="error"
                      onClick={async () => {
                        try {
                          // Envío directo con datos mínimos
                          const testData = {
                            name: "Test Directo",
                            email: `test-direct-${Date.now()}@example.com`,
                            password: "Password123",
                            role: "receptionist",
                            gender: "male",
                            phone: 1234567890
                          };
                          
                          console.log("Enviando datos de prueba directo:", testData);
                          
                          const res = await axios.post("/api/users", testData, {
                            headers: { "Content-Type": "application/json" }
                          });
                          
                          console.log("Respuesta:", res.data);
                          toast.success("Usuario de prueba creado correctamente");
                        } catch (error) {
                          console.error("Error en prueba directa:", error);
                          toast.error("Error en prueba directa");
                        }
                      }}
                    >
                      Prueba directa API (mínimo)
                    </LoadingButton>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default AddMemberPage;