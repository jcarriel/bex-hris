import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import api from '../services/api';

export default function SettingsPage() {
  const { user } = useAuthStore((state: any) => ({
    user: state.user,
  }));

  const { theme, toggleTheme } = useThemeStore();

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handlePasswordChange = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      await api.changePassword(
        passwordData.oldPassword,
        passwordData.newPassword,
        passwordData.confirmPassword
      );
      setMessage('Contraseña actualizada exitosamente');
      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordInputChange = (e: any) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const bgColor = theme === 'light' ? 'white' : '#1f2937';
  const textColor = theme === 'light' ? '#333' : '#e5e7eb';
  const borderColor = theme === 'light' ? '#eee' : '#374151';
  const inputBgColor = theme === 'light' ? '#f5f5f5' : '#374151';
  const inputTextColor = theme === 'light' ? '#333' : '#e5e7eb';
  const labelColor = theme === 'light' ? '#555' : '#d1d5db';
  const hoverBgColor = theme === 'light' ? '#f5f7fa' : '#374151';
  const cardBgColor = theme === 'light' ? 'white' : '#111827';

  return (
    <div style={{ padding: '20px', background: theme === 'light' ? '#f5f7fa' : '#111827', minHeight: '100vh' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '20px' }}>
        {/* Sidebar */}
        <div style={{
          background: cardBgColor,
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          height: 'fit-content',
          border: `1px solid ${borderColor}`,
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { id: 'profile', label: 'Perfil', icon: '👤' },
              { id: 'password', label: 'Contraseña', icon: '🔐' },
              { id: 'system', label: 'Sistema', icon: '⚙️' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  padding: '12px 15px',
                  background: activeTab === item.id ? hoverBgColor : 'transparent',
                  border: 'none',
                  borderLeft: activeTab === item.id ? '3px solid #667eea' : '3px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  color: activeTab === item.id ? '#667eea' : labelColor,
                  transition: 'all 0.3s',
                }}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'profile' && (
            <div style={{
              background: cardBgColor,
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: `1px solid ${borderColor}`,
            }}>
              <h3 style={{ marginTop: 0, color: textColor }}>Información del Perfil</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: labelColor, fontSize: '14px' }}>
                    Usuario
                  </label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '5px',
                      fontSize: '14px',
                      background: inputBgColor,
                      color: inputTextColor,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: labelColor, fontSize: '14px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '5px',
                      fontSize: '14px',
                      background: inputBgColor,
                      color: inputTextColor,
                    }}
                  />
                </div>
              </div>
              <p style={{ color: '#999', fontSize: '12px', marginTop: '15px' }}>
                Para cambiar tu información de perfil, contacta al administrador del sistema.
              </p>
            </div>
          )}

          {activeTab === 'password' && (
            <div style={{
              background: cardBgColor,
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: `1px solid ${borderColor}`,
            }}>
              <h3 style={{ marginTop: 0, color: textColor }}>Cambiar Contraseña</h3>
              {message && (
                <div style={{
                  background: message.includes('exitosamente') ? '#d4edda' : '#f8d7da',
                  color: message.includes('exitosamente') ? '#155724' : '#721c24',
                  padding: '12px',
                  borderRadius: '5px',
                  marginBottom: '15px',
                  fontSize: '14px',
                }}>
                  {message}
                </div>
              )}
              <form onSubmit={handlePasswordChange} style={{ maxWidth: '400px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: labelColor, fontSize: '14px' }}>
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    name="oldPassword"
                    value={passwordData.oldPassword}
                    onChange={handlePasswordInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '5px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      background: inputBgColor,
                      color: inputTextColor,
                    }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: labelColor, fontSize: '14px' }}>
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '5px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      background: inputBgColor,
                      color: inputTextColor,
                    }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: labelColor, fontSize: '14px' }}>
                    Confirmar Contraseña
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '5px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      background: inputBgColor,
                      color: inputTextColor,
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    background: '#00A86B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: loading ? 0.7 : 1,
                    transition: 'background 0.2s',
                  }}
                >
                  {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'system' && (
            <div style={{
              background: cardBgColor,
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: `1px solid ${borderColor}`,
            }}>
              <h3 style={{ marginTop: 0, color: textColor }}>Configuración del Sistema</h3>
              
              {/* Tema */}
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ marginTop: 0, marginBottom: '15px', color: textColor }}>Apariencia</h4>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '15px',
                  background: theme === 'light' ? '#f9f9f9' : '#374151',
                  borderRadius: '6px',
                  border: `1px solid ${borderColor}`,
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: textColor, fontWeight: '500', fontSize: '14px' }}>
                      Modo Oscuro
                    </label>
                    <p style={{ margin: '0', color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '12px' }}>
                      Tema actual: <strong>{theme === 'dark' ? 'Oscuro 🌙' : 'Claro ☀️'}</strong>
                    </p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    style={{
                      padding: '10px 20px',
                      background: theme === 'dark' ? '#00A86B' : '#f0f0f0',
                      color: theme === 'dark' ? 'white' : '#333',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '5px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.opacity = '0.8';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.opacity = '1';
                    }}
                  >
                    {theme === 'dark' ? '☀️ Cambiar a Claro' : '🌙 Cambiar a Oscuro'}
                  </button>
                </div>
              </div>

              {/* Información del Sistema */}
              <div>
                <h4 style={{ marginTop: 0, marginBottom: '15px', color: textColor }}>Información</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                  <div>
                    <label style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '12px' }}>Versión</label>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: textColor }}>1.0.0</div>
                  </div>
                  <div>
                    <label style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '12px' }}>Última Actualización</label>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: textColor }}>
                      {new Date().toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '12px' }}>Base de Datos</label>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: textColor }}>SQLite</div>
                  </div>
                  <div>
                    <label style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '12px' }}>API</label>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: textColor }}>Node.js/Express</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
