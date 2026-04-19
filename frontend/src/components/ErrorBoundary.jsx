import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🔴 ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0a0a0a',
          color: '#fff',
          padding: '20px',
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif"
        }}>
          <h1 style={{fontSize: '2rem', fontWeight: 900, marginBottom: '12px'}}>
            <span style={{color: '#00E676'}}>Zomp</span>
          </h1>
          <p style={{fontSize: '1.1rem', marginBottom: '8px', fontWeight: 700}}>
            Ops! Algo deu errado.
          </p>
          <p style={{fontSize: '0.85rem', color: '#888', marginBottom: '24px', maxWidth: '400px'}}>
            {this.state.error?.message || 'Erro desconhecido'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '14px 32px',
              background: '#00E676',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Recarregar App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
