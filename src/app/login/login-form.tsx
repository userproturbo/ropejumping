"use client";

import { getProviders, signIn } from "next-auth/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type LoginFormProps = {
  callbackUrl: string;
};

type AuthProvider = NonNullable<
  Awaited<ReturnType<typeof getProviders>>
>[string];

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [providers, setProviders] = useState<AuthProvider[]>([]);
  const [email, setEmail] = useState("");
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProviders = async () => {
      const authProviders = await getProviders();

      if (isMounted) {
        setProviders(Object.values(authProviders ?? {}));
        setIsLoadingProviders(false);
      }
    };

    void loadProviders();

    return () => {
      isMounted = false;
    };
  }, []);

  const credentialsProvider = useMemo(
    () =>
      providers.find((provider) => provider.id === "dev-credentials") ??
      providers.find((provider) => provider.type === "credentials") ??
      null,
    [providers],
  );
  const otherProviders = providers.filter(
    (provider) => provider.id !== credentialsProvider?.id,
  );

  const handleCredentialsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!credentialsProvider) return;

    setError(null);
    setPendingProviderId(credentialsProvider.id);

    try {
      await signIn(credentialsProvider.id, {
        email,
        callbackUrl,
      });
    } catch {
      setPendingProviderId(null);
      setError("Не удалось войти. Проверьте email и попробуйте еще раз.");
    }
  };

  const handleProviderSignIn = async (provider: AuthProvider) => {
    setError(null);
    setPendingProviderId(provider.id);

    try {
      await signIn(provider.id, {
        callbackUrl,
      });
    } catch {
      setPendingProviderId(null);
      setError("Не удалось открыть вход. Попробуйте еще раз.");
    }
  };

  const isPending = pendingProviderId !== null;

  return (
    <div className="mt-8">
      {credentialsProvider ? (
        <form onSubmit={handleCredentialsSubmit}>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-[var(--app-text-secondary)]"
          >
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="dev@ropejumping.local"
            autoComplete="email"
            required
            className="mt-2 block w-full border border-[var(--app-border-strong)] bg-[var(--app-bg)] px-3 py-2.5 text-base text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-text)] sm:text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="mt-4 inline-flex w-full justify-center border border-[var(--app-border-strong)] bg-[var(--app-text)] px-4 py-2.5 text-sm font-medium text-[var(--app-bg)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingProviderId === credentialsProvider.id
              ? "Входим..."
              : "Войти"}
          </button>
        </form>
      ) : null}

      {otherProviders.length > 0 ? (
        <div className={credentialsProvider ? "mt-4 grid gap-3" : "grid gap-3"}>
          {otherProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              disabled={isPending}
              onClick={() => void handleProviderSignIn(provider)}
              className="inline-flex w-full justify-center border border-[var(--app-border-strong)] bg-[var(--app-surface-muted)] px-4 py-2.5 text-sm font-medium text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingProviderId === provider.id
                ? "Открываем вход..."
                : getProviderButtonLabel(provider.name)}
            </button>
          ))}
        </div>
      ) : null}

      {isLoadingProviders ? (
        <p className="text-sm text-[var(--app-text-muted)]">
          Загружаем способы входа...
        </p>
      ) : null}

      {!isLoadingProviders && providers.length === 0 ? (
        <p className="text-sm text-[var(--app-text-muted)]">
          Способы входа сейчас недоступны.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-[var(--app-text-secondary)]">{error}</p>
      ) : null}
    </div>
  );
}

function getProviderButtonLabel(providerName: string) {
  if (providerName.toLowerCase() === "discord") {
    return "Войти через Discord";
  }

  return "Войти";
}
