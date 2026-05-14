import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { signOut } from '@/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Lightbulb, LayoutDashboard, FileText, ShieldCheck, LogOut, User } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col bg-background">
      <nav
        className="bg-card border-b border-border"
        aria-label="Main navigation"
      >
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo + nav links */}
          <div className="flex items-center gap-8">
            <Link
              href={isAdmin ? '/admin' : '/home'}
              className="flex items-center gap-2 font-bold text-brand-400 hover:text-brand-300 transition-colors"
            >
              <Lightbulb className="h-5 w-5 text-accent-500" aria-hidden="true" />
              <span>InnovatEPAM</span>
            </Link>

            <div className="flex items-center gap-1">
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Admin Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/home"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    Home
                  </Link>
                  <Link
                    href="/ideas"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Lightbulb className="h-4 w-4" aria-hidden="true" />
                    My Ideas
                  </Link>
                  <Link
                    href="/ideas/drafts"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    Drafts
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-500/20 text-brand-300 font-semibold text-xs">
                {session.user.name?.[0]?.toUpperCase() ?? <User className="h-3 w-3" />}
              </span>
              <span className="hidden sm:block">{session.user.name}</span>
            </div>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/login' });
              }}
            >
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground gap-1.5"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:block">Logout</span>
              </Button>
            </form>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
