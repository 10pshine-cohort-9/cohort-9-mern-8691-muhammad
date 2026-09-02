import { AuthShell } from '@/components/layout/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

export const metadata = { title: 'Log in — Memories' };

export default function LoginPage(): React.ReactElement {
  return (
    <AuthShell mode="login">
      <LoginForm />
    </AuthShell>
  );
}
