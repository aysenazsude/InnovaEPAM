import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getRoleHome } from '@/lib/auth/sessionManager';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default async function RegisterPage() {
  const session = await auth();

  if (session?.user) {
    const role = (session.user as { role?: string }).role ?? 'submitter';
    redirect(getRoleHome(role));
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-semibold text-center">Create your account</h1>
          <p className="text-center text-muted-foreground text-sm">
            Join InnovatEPAM and share your ideas
          </p>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <a href="/login" className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
