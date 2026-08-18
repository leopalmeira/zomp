import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Smartphone, CheckCircle, Share2, PlusSquare, ArrowDown, X, Sparkles } from 'lucide-react'
import './DownloadAppBanner.css'

export default function DownloadAppBanner({ role = 'PASSENGER' }) {
  const isDriver = role === 'DRIVER'
  const appLabel = isDriver ? 'Motorista' : 'Passageiro'
  const appColor = isDriver ? '#00E676' : '#33a3ff'
  const targetPath = isDriver ? '/motorista' : '/passageiro'

  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || window.isAppInstalled
    if (standalone) {
      setIsInstalled(true)
    }

    // Check existing deferredPrompt
    if (window.deferredPrompt) {
      setInstallPrompt(window.deferredPrompt)
    }

    // Listener for PWA Prompt Ready
    const onPromptReady = (e) => {
      const promptEvent = e.detail || e
      setInstallPrompt(promptEvent)
      window.deferredPrompt = promptEvent
    }

    const onAppInstalled = () => {
      setIsInstalled(true)
      setIsDownloading(false)
      setShowModal(false)
      window.deferredPrompt = null
    }

    window.addEventListener('beforeinstallprompt', onPromptReady)
    window.addEventListener('pwa-prompt-ready', onPromptReady)
    window.addEventListener('appinstalled', onAppInstalled)
    window.addEventListener('pwa-installed', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPromptReady)
      window.removeEventListener('pwa-prompt-ready', onPromptReady)
      window.removeEventListener('appinstalled', onAppInstalled)
      window.removeEventListener('pwa-installed', onAppInstalled)
    }
  }, [])

  // Gera e baixa o arquivo do lançador do app instantaneamente
  const triggerLauncherFileDownload = () => {
    try {
      const fullUrl = `${window.location.origin}${targetPath}`
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="theme-color" content="${isDriver ? '#00E676' : '#33a3ff'}">
  <title>Zomp ${appLabel}</title>
  <style>
    body {
      margin: 0;
      background: #18181b;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      padding: 20px;
    }
    .logo {
      font-size: 2.5rem;
      font-weight: 900;
      color: ${isDriver ? '#00E676' : '#33a3ff'};
      margin-bottom: 15px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255,255,255,0.1);
      border-top-color: ${isDriver ? '#00E676' : '#33a3ff'};
      border-radius: 50%;
      animation: spin 1s infinite linear;
      margin-bottom: 20px;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    a { color: ${isDriver ? '#00E676' : '#33a3ff'}; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="logo">⚡ ZOMP ${appLabel.toUpperCase()}</div>
  <div class="spinner"></div>
  <h3>Iniciando Aplicativo...</h3>
  <p>Se não abrir automaticamente, <a href="${fullUrl}">clique aqui para acessar</a>.</p>
  <script>
    window.location.replace("${fullUrl}");
  </script>
</body>
</html>`

      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Zomp_${appLabel}_App.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.warn('Erro ao disparar download direto:', err)
    }
  }

  const handleDownloadClick = async (e) => {
    if (e) e.stopPropagation()
    setIsDownloading(true)

    const activePrompt = installPrompt || window.deferredPrompt

    if (activePrompt) {
      try {
        await activePrompt.prompt()
        const { outcome } = await activePrompt.userChoice
        if (outcome === 'accepted') {
          setIsInstalled(true)
          setInstallPrompt(null)
          window.deferredPrompt = null
        }
      } catch (err) {
        console.warn('Erro no prompt nativo:', err)
      } finally {
        setIsDownloading(false)
      }
    } else {
      // Se não há prompt nativo disponível no momento (iOS, navegador sem suporte ou bloqueado):
      // Dispara o download direto do instalador/lançador HTML e abre guia visual
      triggerLauncherFileDownload()
      setShowModal(true)
      setIsDownloading(false)
    }
  }

  if (isInstalled) {
    return (
      <div 
        className={`zomp-download-banner ${isDriver ? 'driver-mode' : 'passenger-mode'}`}
        style={{ cursor: 'default' }}
      >
        <div className={`zomp-banner-icon-box ${isDriver ? 'driver-bg' : 'passenger-bg'}`}>
          <CheckCircle size={24} color="#fff" />
        </div>
        <div className="zomp-banner-content">
          <div className="zomp-banner-title">
            App {appLabel} Instalado ✅
          </div>
          <div className="zomp-banner-subtitle">
            Você está usando a versão otimizada do Zomp.
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <motion.div
        className={`zomp-download-banner ${isDriver ? 'driver-mode' : 'passenger-mode'}`}
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onClick={handleDownloadClick}
      >
        <div className="zomp-banner-glow-line" style={{ background: appColor }} />

        {/* App Icon with Ready Dot */}
        <div className={`zomp-banner-icon-box ${isDriver ? 'driver-bg' : 'passenger-bg'}`}>
          <Smartphone size={24} color="#fff" />
          <div className="zomp-download-pulse-badge" style={{ backgroundColor: appColor }} />
        </div>

        {/* Text Details */}
        <div className="zomp-banner-content">
          <div className="zomp-banner-title-row">
            <span className="zomp-banner-title">
              <Download size={16} color={appColor} />
              Baixar App {appLabel}
            </span>
          </div>
          <div className="zomp-banner-subtitle">
            Instale direto no seu celular para acesso rápido e notificações
          </div>
          <div className="zomp-banner-status-tag" style={{ color: appColor }}>
            <Sparkles size={12} />
            <span>Pronto para download</span>
          </div>
        </div>

        {/* Direct Action Button */}
        <button
          type="button"
          className={`zomp-banner-btn ${isDriver ? 'driver-btn' : 'passenger-btn'}`}
          onClick={handleDownloadClick}
          disabled={isDownloading}
        >
          {isDownloading ? (
            'BAIXANDO...'
          ) : (
            <>
              <Download size={14} />
              <span>BAIXAR DIRETO</span>
            </>
          )}
        </button>
      </motion.div>

      {/* Interactive Modal Guide / Direct Installer for Non-PWA-prompt environments */}
      <AnimatePresence>
        {showModal && (
          <div className="zomp-install-modal-overlay" onClick={() => setShowModal(false)}>
            <motion.div
              className="zomp-install-modal-card"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="zomp-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: appColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Smartphone size={18} color="#000" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>
                      Baixar Zomp {appLabel}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: appColor, fontWeight: 700 }}>
                      Download & Instalação Direta
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="zomp-modal-close-btn"
                  onClick={() => setShowModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {isIOS ? (
                /* Instruções iOS Safari */
                <div>
                  <p style={{ color: '#cbd5e1', fontSize: '0.84rem', marginBottom: '14px', lineHeight: '1.4' }}>
                    Para instalar o aplicativo no seu <strong>iPhone ou iPad</strong>:
                  </p>

                  <div className="zomp-modal-step">
                    <div className="zomp-modal-step-number" style={{ background: appColor }}>1</div>
                    <div className="zomp-modal-step-text">
                      Toque no botão de <strong>Compartilhar</strong> (<Share2 size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />) na barra inferior do Safari.
                    </div>
                  </div>

                  <div className="zomp-modal-step">
                    <div className="zomp-modal-step-number" style={{ background: appColor }}>2</div>
                    <div className="zomp-modal-step-text">
                      Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong> (<PlusSquare size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />).
                    </div>
                  </div>

                  <div className="zomp-modal-step">
                    <div className="zomp-modal-step-number" style={{ background: appColor }}>3</div>
                    <div className="zomp-modal-step-text">
                      Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto! O app Zomp será instalado no seu celular.
                    </div>
                  </div>
                </div>
              ) : (
                /* Instruções Android / Desktop / Chrome */
                <div>
                  <p style={{ color: '#cbd5e1', fontSize: '0.84rem', marginBottom: '14px', lineHeight: '1.4' }}>
                    O arquivo de inicialização direta foi <strong>baixado</strong> para o seu dispositivo!
                  </p>

                  <div className="zomp-modal-step">
                    <div className="zomp-modal-step-number" style={{ background: appColor }}>1</div>
                    <div className="zomp-modal-step-text">
                      No navegador (Chrome/Edge), toque no menu de <strong>3 pontos (⋮)</strong> no topo.
                    </div>
                  </div>

                  <div className="zomp-modal-step">
                    <div className="zomp-modal-step-number" style={{ background: appColor }}>2</div>
                    <div className="zomp-modal-step-text">
                      Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                    </div>
                  </div>

                  <div className="zomp-modal-step">
                    <div className="zomp-modal-step-number" style={{ background: appColor }}>3</div>
                    <div className="zomp-modal-step-text">
                      Ou abra o arquivo <strong>Zomp_{appLabel}_App.html</strong> baixado para acessar direto em tela cheia!
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="zomp-modal-download-trigger-btn"
                style={{ background: `linear-gradient(135deg, ${appColor} 0%, ${isDriver ? '#059669' : '#2563eb'} 100%)` }}
                onClick={() => {
                  triggerLauncherFileDownload()
                  setShowModal(false)
                }}
              >
                <ArrowDown size={18} />
                <span>BAIXAR ARQUIVO NOVAMENTE</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
