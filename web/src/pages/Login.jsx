import { useState, useRef } from "react";
import { login } from "../api/index.js";

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
          <div className="login-crest">
            <span className="login-crest-mark">УДО</span>
          </div>
          <div className="login-card-title-row">
            <div className="login-card-title">АРМ ПСИХОЛОГА</div>
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
            <input
              ref={passRef}
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={locked || submitting}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          <div className="login-actions">
            <span />
            <button type="submit" className="btn primary" disabled={locked || submitting}>
              {submitting ? "…" : "Підключити ▸"}
            </button>
          </div>
        </div>

        <div className="login-footer-bar">
          <span><span className="dot">●</span> SPS-NODE-01 OK</span>
          <span>СЕРТ. №UA-СПС-2026-0241</span>
        </div>
      </form>
    </div>
  );
}
