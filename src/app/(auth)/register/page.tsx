import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getRoleHome } from '@/lib/auth/sessionManager';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

export default async function RegisterPage() {
  const session = await auth();

  if (session?.user) {
    const role = (session.user as { role?: string }).role ?? 'submitter';
    redirect(getRoleHome(role));
  }

  return (
    <main className="min-h-screen flex">
      {/* Left branded panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 to-brand-800 flex-col justify-center items-center p-12 text-white">
        <Lightbulb className="h-16 w-16 text-accent-400 mb-6" aria-hidden="true" />
        <h1 className="text-4xl font-bold mb-4">InnovatEPAM</h1>
        <p className="text-brand-200 text-center text-lg max-w-sm">
          Share your ideas. Shape the future of EPAM.
        </p>
        <div className="mt-12 space-y-4 w-full max-w-xs">
          {['Submit ideas easily', 'Track review progress', 'See your impact'].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center text-xs">✓</span>
              <span className="text-brand-100">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Lightbulb className="h-6 w-6 text-accent-500" aria-hidden="true" />
            <span className="font-bold text-xl text-brand-400">InnovatEPAM</span>
          </div>
            <Card className="shadow-lg border border-border bg-card">
            <CardHeader className="pb-2">
              <h2 className="text-2xl font-semibold">Create your account</h2>
              <p className="text-muted-foreground text-sm">Join InnovatEPAM and share your ideas</p>
            </CardHeader>
            <CardContent>
              <RegisterForm />
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <a href="/login" className="text-brand-400 hover:underline font-medium">
                  Sign in
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
