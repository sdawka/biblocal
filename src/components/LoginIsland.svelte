<script lang="ts">
  type Step = 'email' | 'code' | 'done';

  let step: Step = $state('email');
  let email = $state('');
  let code = $state('');
  let error = $state('');
  let loading = $state(false);

  async function sendCode() {
    if (!email.trim() || !email.includes('@')) {
      error = 'Please enter a valid email';
      return;
    }

    loading = true;
    error = '';

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || 'Failed to send code';
        return;
      }

      step = 'code';
    } catch (e) {
      error = 'Network error';
    } finally {
      loading = false;
    }
  }

  async function verifyCode() {
    if (!code.trim()) {
      error = 'Please enter the code';
      return;
    }

    loading = true;
    error = '';

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || 'Invalid code';
        return;
      }

      step = 'done';
      window.location.href = '/shelf';
    } catch (e) {
      error = 'Network error';
    } finally {
      loading = false;
    }
  }

  function goBack() {
    step = 'email';
    code = '';
    error = '';
  }
</script>

<div class="login">
  {#if step === 'email'}
    <h2>Sign in to biblocal</h2>
    <p class="subtitle">Enter your email to receive a login code</p>

    <form onsubmit={(e) => { e.preventDefault(); sendCode(); }}>
      <input
        type="email"
        bind:value={email}
        placeholder="your@email.com"
        disabled={loading}
        autofocus
      />

      {#if error}
        <p class="error">{error}</p>
      {/if}

      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send code'}
      </button>
    </form>
  {:else if step === 'code'}
    <h2>Check your email</h2>
    <p class="subtitle">We sent a code to <strong>{email}</strong></p>

    <form onsubmit={(e) => { e.preventDefault(); verifyCode(); }}>
      <input
        type="text"
        bind:value={code}
        placeholder="Enter code"
        disabled={loading}
        autofocus
        maxlength={6}
        class="code-input"
      />

      {#if error}
        <p class="error">{error}</p>
      {/if}

      <button type="submit" disabled={loading}>
        {loading ? 'Verifying...' : 'Sign in'}
      </button>

      <button type="button" class="link" onclick={goBack}>
        Use different email
      </button>
    </form>
  {:else}
    <h2>Welcome!</h2>
    <p class="subtitle">Redirecting to your shelf...</p>
  {/if}
</div>

<style>
  .login {
    max-width: 380px;
    margin: 0 auto;
    padding: 2rem;
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lifted);
    text-align: center;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-ink);
  }

  .subtitle {
    margin: 0 0 1.5rem;
    font-family: var(--font-body);
    font-size: 0.95rem;
    color: var(--color-ink-faded);
  }

  .subtitle strong {
    color: var(--color-ink);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  input {
    padding: 0.75rem 1rem;
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--color-ink);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    text-align: center;
    transition: all var(--transition-quick);
    box-shadow: var(--shadow-inset);
  }

  input::placeholder {
    color: var(--color-ink-light);
  }

  input:focus {
    outline: none;
    border-color: var(--color-gold);
    box-shadow: var(--shadow-inset), 0 0 0 3px rgba(184, 134, 11, 0.15);
  }

  .code-input {
    font-size: 1.5rem;
    letter-spacing: 0.25em;
    text-transform: uppercase;
  }

  .error {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: #8B2500;
    font-style: italic;
  }

  button[type="submit"] {
    padding: 0.75rem 1.25rem;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-cream);
    background: linear-gradient(
      to bottom,
      var(--color-burgundy-light),
      var(--color-burgundy),
      var(--color-burgundy-dark)
    );
    border: 1px solid var(--color-burgundy-dark);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-gentle);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.15),
      0 2px 4px rgba(74, 44, 42, 0.3);
  }

  button[type="submit"]:hover:not(:disabled) {
    background: linear-gradient(
      to bottom,
      var(--color-burgundy),
      var(--color-burgundy-dark),
      #4A1F25
    );
    transform: translateY(-1px);
  }

  button[type="submit"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  button.link {
    background: none;
    border: none;
    padding: 0.5rem;
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: var(--color-ink-faded);
    cursor: pointer;
    text-decoration: underline;
  }

  button.link:hover {
    color: var(--color-burgundy);
  }
</style>
