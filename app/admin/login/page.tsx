"use client";

export default function AdminLoginPage() {
  return (
    <main className="container section">
      <div className="login-shell">
        <div className="login-card">
          <div className="login-header">
            <h1>Admin Sign In</h1>
            <p>Secure access for internal review and workflow management.</p>
          </div>

          <form className="login-form">
            <label className="input-label" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              className="text-input"
              type="email"
              placeholder="you@company.com"
            />

            <label className="input-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="text-input"
              type="password"
              placeholder="••••••••"
            />

            <button className="button-primary" type="button">
              Sign in
            </button>

            <div className="login-divider">
              <span>or</span>
            </div>

            <button className="button-secondary" type="button">
              Send one-time code
            </button>
          </form>

          <p className="login-note">
            Demo only — authentication is mocked for client preview.
          </p>
        </div>
      </div>
    </main>
  );
}
