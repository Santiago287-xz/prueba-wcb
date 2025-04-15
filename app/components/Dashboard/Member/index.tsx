import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import ClientOnly from "@/app/components/ClientOnly/page";
import { Container, Box } from "@mui/material";

export const revalidate = 0;

export default async function IndexPage() {
  const session = await getServerSession(options);
  
  if (!session || !session.user) {
    redirect('/signin');
  }
  
  const user = session.user;

  return (
    <ClientOnly>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box 
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 2, 
            background: 'linear-gradient(145deg, #2a3f54 0%, #1a2a3a 100%)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}
        >
          <h2>Bienvenido, {user.name}</h2>
        </Box>
        
        <Box sx={{ textAlign: 'center', p: 5 }}>
          <h3>Redirigiendo...</h3>
          <p>Por favor espere mientras accede a su panel personalizado.</p>
        </Box>
      </Container>
    </ClientOnly>
  );
}