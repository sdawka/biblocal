interface ReadableValue<T> {
  get(): T;
  subscribe(listener: (value: T) => void): () => void;
}

export function watchSignInRedirect(
  loaded: ReadableValue<boolean>,
  session: ReadableValue<{ status: string } | null | undefined>,
  redirect: () => void,
): () => void {
  let redirected = false;
  const check = () => {
    // Pending sessions may still require MFA or another Clerk session task.
    if (redirected || !loaded.get() || session.get()?.status !== 'active') return;
    redirected = true;
    redirect();
  };
  const stopLoaded = loaded.subscribe(check);
  const stopSession = session.subscribe(check);
  return () => {
    stopLoaded();
    stopSession();
  };
}
