import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error atrapado en la app:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px',
          background: '#090d16',
          color: '#f8fafc',
          minHeight: '100vh',
          fontFamily: 'sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f43f5e', marginBottom: '8px' }}>
            Hubo un problema al cargar la aplicación
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '400px', marginBottom: '16px' }}>
            {this.state.error?.message || 'Error desconocido'}
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Limpiar datos y Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
