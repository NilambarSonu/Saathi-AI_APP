export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  const normalized = (path || '').trim();
  const compact = normalized.replace(/\/+/g, '/');

  // Handle empty scheme launches like org.saathiai.app:///.
  if (!compact || compact === '/' || compact === '///') {
    return '/';
  }

  // Route bare group paths to concrete screens.
  if (compact === '/(onboarding)' || compact === '/(onboarding)/index') {
    return '/(onboarding)';
  }

  // Map known top-level routes without a leading slash.
  if (compact === '(app)' || compact === 'app') {
    return '/(app)';
  }
  if (compact === '(auth)' || compact === 'auth') {
    return '/(auth)/login';
  }

  // For cold starts, avoid ending on an unmatched route for unknown payloads.
  if (initial && !compact.startsWith('/')) {
    return '/';
  }

  return compact;
}
