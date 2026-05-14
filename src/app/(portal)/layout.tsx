import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { signOut } from '@/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = (session.user as { role?: string }).role ?? 'submitter';
  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen flex flex-col">
      <nav
        className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-6">
          <span className="font-semibold text-lg">InnovatEPAM</span>
          {isAdmin ? (
            <Link
              href="/admin"
              className="text-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Admin Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/ideas"
                className="text-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                My Ideas
              </Link>
              <Link
                href="/ideas/drafts"
                className="text-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                My Drafts
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm opacity-80">{session.user.name}</span>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="text-foreground"
            >
              Logout
            </Button>
          </form>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
