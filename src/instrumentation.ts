import { postNtfy } from '@/lib/ntfy';

export async function register() {
  postNtfy('OSIRIS Startup', 'OSIRIS server process started', 'info,system').catch(() => {});
}

export async function unregister() {
  postNtfy('OSIRIS Shutdown', 'OSIRIS server process shutting down', 'info,system').catch(() => {});
}
