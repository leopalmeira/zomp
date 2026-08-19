import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Smartphone, Share2, PlusSquare, ArrowDown, X } from 'lucide-react'
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
      triggerLauncherFileDownload()
      setShowModal(true)
      setIsDownloading(false)
    }
  }

  // Se já estiver instalado, não polui a tela
  if (isInstalled) {
    return null
  }

  return (
    <>
      {/* Botão / Pílula Discreta de Download */}
      <motion.div
        className={`zomp-discreet-download-pill ${isDriver ? 'driver-pill' : 'passenger-pill'}`}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={handleDownloadClick}
      >
        <div className="zomp-pill-icon">
          <Smartphone size={13} color={appColor} />
        </div>
        <span className="zomp-pill-text">
          Baixar App {appLabel}
        </span>
        <button
          type="button"
          className="zomp-pill-action-btn"
          onClick={handleDownloadClick}
          disabled={isDownloading}
        >
          {isDownloading ? (
            '...'
          ) : (
            <>
              <Download size={11} />
              <span>Instalar</span>
            </>
          )}
        </button>
      </motion.div>

      {/* Modal Interativo de Instalação Rápida */}
      <AnimatePresence>
        {showModal && (
          <div className="zomp-install-modal-overlay" onClick={() => setShowModal(false)}>
            <motion.div
              className="zomp-install-modal-card"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="zomp-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: appColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Smartphone size={16} color="#000" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '0.98rem', fontWeight: 800 }}>
                      Instalar Zomp {appLabel}
                    </h3>
                    <span style={{ fontSize: '0.70rem', color: appColor, fontWeight: 700 }}>
                      Acesso rápido na tela inicial
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="zomp-modal-close-btn"
                  onClick={() => setShowModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              {isIOS ? (
                <div>
                  <p style={{ color: '#cbd5e1', fontSize: '0.82rem', marginBottom: '12px', lineHeight: '1.4' }}>
                    Para adicionar à tela de início no <strong>iPhone ou iPad</strong>:
                  </p>

                  <div className="zomp-modal-step">
                    <div className="zomp-modal-step-number" style={{ background: appColor }}>1</div>
                    <div className="zomp-modal-step-text">
                      Toque em <strong>Compartilhar</strong> (<Share2 size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />) no Safari.
                    </div>
                  </div>

                  <div className="zomp-modal-step">
                    <div className="zomp-modal-step-number" style={{ background: appColor }}>2</div>
                    <div className="zomp-modal-step-text">
                      Role e selecione <strong>"Adicionar à Tela de Início"</strong> (<PlusSquare size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />).
                    </div>
                  </div>

                  <div className="zomp-modal-step">
                    <div className="zomp-modal-step-number" style={{ background: appColor }}>3</div>
                    <div className="zomp-modal-step-text">
                      Toque em <strong>"Adicionar"</strong> no topo direito.
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ color: '#cbd5e1', fontSize: '0.82rem', marginBottom: '12px', lineHeight: '1.4' }}>
                    O inicializador foi <strong>baixado</strong> no seu aparelho:
                  </p>

                  <div className="zomp-modal-step">
                    <div className="zomp-modal-step-number" style={{ background: appColor }}>1</div>
                    <div className="zomp-modal-step-text">
                      No navegador (Chrome/Edge), toque no menu de <strong>3 pontos (⋮)</strong>.
                    </div>
                  </div>

                  <div className="zomp-modal-step">
                    <div className="zomp-modal-step-number" style={{ background: appColor }}>2</div>
                    <div className="zomp-modal-step-text">
                      Escolha <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                    </div>
                  </div>

                  <div className="zomp-modal-step">
                    <div className="zomp-modal-step-number" style={{ background: appColor }}>3</div>
                    <div className="zomp-modal-step-text">
                      Ou abra o arquivo <strong>Zomp_{appLabel}_App.html</strong> para abrir em tela cheia!
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
                <ArrowDown size={15} />
                <span>BAIXAR ARQUIVO NOVAMENTE</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
