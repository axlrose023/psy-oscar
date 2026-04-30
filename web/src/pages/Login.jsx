import { useState, useRef } from "react";
import { login } from "../api/index.js";

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const passRef = useRef(null);

  const MAX_ATTEMPTS = 3;
  const remaining = Math.max(0, MAX_ATTEMPTS - attempts);
  const locked = attempts >= MAX_ATTEMPTS;

  async function submit(e) {
    e?.preventDefault();
    if (locked || submitting) return;
    if (!username.trim() || !password) {
      setError("Введіть логін та пароль");
      setAttempts((a) => a + 1);
      passRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      onLogin();
    } catch (err) {
      setSubmitting(false);
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setError("Обліковий запис тимчасово заблоковано. Зверніться до адміністратора.");
        passRef.current?.blur();
      } else {
        setError(err.message || "Невірний логін або пароль");
        passRef.current?.select();
      }
    }
  }

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2,"0")}.${String(today.getMonth()+1).padStart(2,"0")}.${today.getFullYear()}`;

  return (
    <div className="login-screen">
      <div className="login-corner tl">УДО · СПС-АРМ-01</div>
      <div className="login-corner tr">ДЛЯ СЛУЖБОВОГО КОРИСТУВАННЯ</div>
      <div className="login-corner bl">КЛАС. ЗАХ. — К3 / ОЗ</div>
      <div className="login-corner br">{dateStr} · UA-KYI-01</div>

      <form className="login-card" onSubmit={submit}>
        <div className="login-card-header">
          <div className="login-crest" aria-hidden="true">
            <svg className="login-crest-mark" viewBox="0 0 64 64" role="img">
              <path d="M32 6 52 16v15c0 13-8.5 22.5-20 27C20.5 53.5 12 44 12 31V16L32 6Z" />
              <path d="M32 19a13 13 0 1 0 0 26 13 13 0 0 0 0-26Zm0 7a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" />
            </svg>
          </div>
          <div className="login-card-title-row">
            <div className="login-card-title">Oscar</div>
            <div className="login-card-sub">Автоматизоване робоче місце психолога УДО України</div>
          </div>
        </div>

        <div className="login-form">
          <div className="login-system-line">
            <span>СЕАНС · {dateStr}</span>
            <span className="lock">▮ АВТОРИЗАЦІЯ ОБОВʼЯЗКОВА</span>
          </div>

          {error && (
            <div className={`login-warn ${attempts >= 2 ? "danger" : ""}`}>
              <span className="label">
                {locked ? "Заблоковано" : attempts >= 2 ? "Останнє попередження" : "Попередження"}
              </span>
              {" "}{error}{!locked && attempts > 0 && ` Залишилось спроб: ${remaining}.`}
            </div>
          )}

          <label className="field">
            <span className="field-label">Логін<span className="req">*</span></span>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={locked || submitting}
              autoFocus
              autoComplete="username"
            />
          </label>
          <label className="field">
            <span className="field-label">Пароль<span className="req">*</span></span>
            <div className="password-field">
              <input
                ref={passRef}
                type={showPassword ? "text" : "password"}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={locked || submitting}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                disabled={locked || submitting}
                aria-label={showPassword ? "Приховати пароль" : "Показати пароль"}
                title={showPassword ? "Приховати пароль" : "Показати пароль"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
                    <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.5 3.1 10 8a15.1 15.1 0 0 1-3.1 5.1" />
                    <path d="M6.6 6.6A14.2 14.2 0 0 0 2 12c1.5 4.9 5 8 10 8 1.7 0 3.2-.4 4.5-1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 12c1.5-4.9 5-8 10-8s8.5 3.1 10 8c-1.5 4.9-5 8-10 8s-8.5-3.1-10-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          <div className="login-actions">
            <span />
            <button type="submit" className="btn primary" disabled={locked || submitting}>
              {submitting ? "…" : "Увійти"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
