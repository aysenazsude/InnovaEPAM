import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getRoleHome } from '@/lib/auth/sessionManager';
import { LoginForm } from '@/components/auth/LoginForm';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Suspense } from 'react';

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    const role = (session.user as { role?: string }).role ?? 'submitter';
    redirect(getRoleHome(role));
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-semibold text-center">Sign in to InnovatEPAM</h1>
          <p className="text-center text-muted-foreground text-sm">
            Use your EPAM portal credentials
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
