import { useEffect, useMemo, useState } from 'react';
import './App.css';

const AUTH_REASON_LABELS = {
  access_denied: 'Connexion refusée côté Twitch.',
  state_mismatch: 'Session invalide (state OAuth incorrect).',
  token_exchange_failed: 'Impossible de récupérer le token Twitch.',
  user_fetch_failed: 'Impossible de charger ton profil Twitch.',
  user_not_found: 'Aucun compte Twitch associé trouvé.',
  callback_exception: 'Erreur inattendue pendant le callback OAuth.'
};

function getAuthFeedback() {
  const params = new URLSearchParams(window.location.search);
  const auth = params.get('auth');
  const reason = params.get('reason');

  if (auth === 'success') {
    return { type: 'success', message: 'Compte Twitch connecté avec succès 🎉' };
  }

  if (auth === 'error') {
    return {
      type: 'error',
      message: AUTH_REASON_LABELS[reason] || 'Échec de connexion Twitch. Réessaie dans quelques secondes.'
    };
  }

  return null;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const authFeedback = useMemo(() => getAuthFeedback(), []);

  const loadUser = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/me', { credentials: 'include' });
      if (!response.ok) {
        setUser(null);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setUser(data.user ?? null);
    } catch {
      setError('Le serveur est injoignable. Vérifie que le backend tourne sur le bon port.');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleLogin = () => {
    window.location.href = '/auth/twitch';
  };

  const handleLogout = async () => {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
  };

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Pokemon Stream Overlay</p>
        <h1>Connexion Twitch fiabilisée</h1>
        <p className="subtitle">
          Connecte ton compte Twitch pour sécuriser ton accès éditeur et éviter les erreurs de session.
        </p>

        {authFeedback && <div className={`banner ${authFeedback.type}`}>{authFeedback.message}</div>}
        {error && <div className="banner error">{error}</div>}

        {loading ? (
          <div className="loading-block">Vérification de la session Twitch...</div>
        ) : user ? (
          <div className="account-card">
            <img src={user.profile_image_url} alt={user.display_name} width="72" height="72" />
            <div>
              <strong>{user.display_name}</strong>
              <p>@{user.login}</p>
              <p className="meta">Connecté le {new Date(user.connected_at).toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <p className="hint">Aucune session active pour le moment.</p>
        )}

        <div className="actions">
          {!user ? (
            <>
              <button className="primary" onClick={handleLogin}>Se connecter avec Twitch</button>
              <button className="ghost" onClick={loadUser}>Rafraîchir l'état</button>
            </>
          ) : (
            <>
              <button className="ghost" onClick={loadUser}>Actualiser la session</button>
              <button className="danger" onClick={handleLogout}>Se déconnecter</button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
