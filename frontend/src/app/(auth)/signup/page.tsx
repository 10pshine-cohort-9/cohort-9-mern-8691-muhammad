import { AuthShell } from '@/components/layout/auth-shell';
import { SignupForm } from '@/components/auth/signup-form';

export const metadata = { title: 'Sign up — Memories' };

export default function SignupPage() {
  return (
    <AuthShell mode="signup">
      <SignupForm />
    </AuthShell>
  );
}
