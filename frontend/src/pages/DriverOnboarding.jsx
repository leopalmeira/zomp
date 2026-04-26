import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../services/api'
import { Car, FileText, CheckCircle, User, ShieldCheck, Zap, Wallet, ArrowRight } from 'lucide-react'
import './Onboarding.css'

const API = 'http://localhost:3001/api'
const getToken = () => localStorage.getItem('zomp_token')

export default function DriverOnboarding() {
  const navigate = useNavigate()
  const [user, setUser] = useState(getCurrentUser())
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    phone: '',
    pixKey: '',
    carPlate: '',
    carModel: '',
    carColor: '',
    cnh: null,
    crlv: null
  })

  // Redirect if not driver or already approved (though onboarding can be forced)
  useEffect(() => {
    if (!user || user.role !== 'DRIVER') {
      navigate('/motorista')
    }
  }, [user, navigate])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = (e, field) => {
    const file = e.target.files[0]
    if (file) {
      setFormData(prev => ({ ...prev, [field]: file }))
    }
  }

  const handleNext = () => {
    setStep(prev => prev + 1)
    window.scrollTo(0, 0)
  }

  const handleBack = () => {
    setStep(prev => prev - 1)
    window.scrollTo(0, 0)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Logic to send documents and profile data to backend
      // Using existing /user/profile endpoint as seen in DriverDashboard.jsx
      const res = await fetch(`${API}/user/profile`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          ...formData,
          cnh: formData.cnh ? 'uploaded' : '', // simplified for mock
          crlv: formData.crlv ? 'uploaded' : ''
        })
      })

      if (!res.ok) throw new Error('Erro ao salvar dados')
      
      const updatedUser = { ...user, ...formData, isApproved: false }
      localStorage.setItem('zomp_user', JSON.stringify(updatedUser))
      setUser(updatedUser)
      
      setStep(5) // Final step
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-bg"></div>
      
      <header className="onboarding-header">
        <img src="/logo.svg" alt="Zomp" className="onboarding-logo" />
        
        <div className="progress-container">
          <div className="progress-line">
            <div 
              className="progress-line-fill" 
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            ></div>
          </div>
          {[1, 2, 3, 4].map(s => (
            <div 
              key={s} 
              className={`progress-step ${step === s ? 'active' : step > s ? 'completed' : ''}`}
            >
              {step > s ? '✓' : s}
            </div>
          ))}
        </div>
      </header>

      <main className="onboarding-main">
        {step === 1 && (
          <div className="step-card">
            <h2 className="step-title">Bem-vindo, Parceiro!</h2>
            <p className="step-description">
              Você está a poucos passos de se tornar um motorista investidor na Zomp. Vamos configurar seu perfil.
            </p>
            
            <div className="feature-badge">
              <div className="feature-icon"><Zap size={20} /></div>
              <div className="feature-info">
                <h4>Ganhe por indicação</h4>
                <p>Receba R$ 0,10 por cada corrida de passageiros indicados.</p>
              </div>
            </div>

            <div className="feature-badge">
              <div className="feature-icon"><Wallet size={20} /></div>
              <div className="feature-info">
                <h4>Taxas Justas</h4>
                <p>Sem comissões abusivas. Você fica com o que é seu.</p>
              </div>
            </div>

            <div className="feature-badge">
              <div className="feature-icon"><ShieldCheck size={20} /></div>
              <div className="feature-info">
                <h4>Segurança Zomp</h4>
                <p>Suporte 24h e monitoramento em tempo real.</p>
              </div>
            </div>

            <div className="button-row">
              <button className="btn-onboarding btn-next" onClick={handleNext}>
                Começar Agora <ArrowRight size={18} style={{marginLeft: '8px', verticalAlign: 'middle'}} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-card">
            <h2 className="step-title">Seu Veículo</h2>
            <p className="step-description">
              Informe os dados do veículo que você utilizará para as corridas.
            </p>

            <div className="form-group">
              <label className="form-label">Modelo do Carro</label>
              <input 
                name="carModel"
                className="form-input" 
                placeholder="Ex: Toyota Corolla" 
                value={formData.carModel}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Placa do Veículo</label>
              <input 
                name="carPlate"
                className="form-input" 
                placeholder="ABC-1234" 
                value={formData.carPlate}
                onChange={e => setFormData({...formData, carPlate: e.target.value.toUpperCase()})}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cor</label>
              <input 
                name="carColor"
                className="form-input" 
                placeholder="Ex: Prata" 
                value={formData.carColor}
                onChange={handleInputChange}
              />
            </div>

            <div className="button-row">
              <button className="btn-onboarding btn-back" onClick={handleBack}>Voltar</button>
              <button 
                className="btn-onboarding btn-next" 
                onClick={handleNext}
                disabled={!formData.carModel || !formData.carPlate}
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-card">
            <h2 className="step-title">Documentação</h2>
            <p className="step-description">
              Precisamos validar sua CNH e o documento do veículo (CRLV).
            </p>

            <div className="form-group">
              <label className="form-label">Foto da CNH</label>
              <input 
                type="file" 
                id="cnh-upload" 
                hidden 
                onChange={(e) => handleFileUpload(e, 'cnh')} 
              />
              <label htmlFor="cnh-upload" className={`upload-box ${formData.cnh ? 'has-file' : ''}`}>
                <span className="upload-icon">🪪</span>
                <p className="upload-text">{formData.cnh ? 'CNH Selecionada' : 'Clique para enviar CNH'}</p>
                <p className="upload-subtext">{formData.cnh ? formData.cnh.name : 'Formatos: JPG, PNG ou PDF'}</p>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Foto do CRLV</label>
              <input 
                type="file" 
                id="crlv-upload" 
                hidden 
                onChange={(e) => handleFileUpload(e, 'crlv')} 
              />
              <label htmlFor="crlv-upload" className={`upload-box ${formData.crlv ? 'has-file' : ''}`}>
                <span className="upload-icon">📄</span>
                <p className="upload-text">{formData.crlv ? 'CRLV Selecionado' : 'Clique para enviar CRLV'}</p>
                <p className="upload-subtext">{formData.crlv ? formData.crlv.name : 'Documento do veículo atualizado'}</p>
              </label>
            </div>

            <div className="button-row">
              <button className="btn-onboarding btn-back" onClick={handleBack}>Voltar</button>
              <button 
                className="btn-onboarding btn-next" 
                onClick={handleNext}
                disabled={!formData.cnh || !formData.crlv}
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step-card">
            <h2 className="step-title">Dados de Pagamento</h2>
            <p className="step-description">
              Onde você deseja receber seus ganhos e royalties?
            </p>

            <div className="form-group">
              <label className="form-label">Telefone de Contato</label>
              <input 
                name="phone"
                className="form-input" 
                placeholder="(00) 00000-0000" 
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Chave PIX (CPF, E-mail ou Celular)</label>
              <input 
                name="pixKey"
                className="form-input" 
                placeholder="Sua chave PIX para repasses" 
                value={formData.pixKey}
                onChange={handleInputChange}
              />
            </div>

            <div className="tip-card" style={{marginTop: '20px', padding: '16px', background: 'rgba(151, 233, 0, 0.05)', borderRadius: '12px', border: '1px solid var(--primary-subtle)'}}>
              <p style={{fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600}}>
                💡 Dica: Mantenha seus dados atualizados para não haver atrasos no pagamento.
              </p>
            </div>

            <div className="button-row">
              <button className="btn-onboarding btn-back" onClick={handleBack}>Voltar</button>
              <button 
                className="btn-onboarding btn-next" 
                onClick={handleSubmit}
                disabled={loading || !formData.pixKey || !formData.phone}
              >
                {loading ? 'Processando...' : 'Finalizar Cadastro'}
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="step-card" style={{textAlign: 'center'}}>
            <div className="animate-check">
              <CheckCircle size={40} />
            </div>
            <h2 className="step-title">Tudo pronto!</h2>
            <p className="step-description">
              Seus dados foram enviados com sucesso. Nossa equipe analisará seus documentos em até 12 horas.
            </p>

            <div style={{background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '16px', marginBottom: '24px', textAlign: 'left'}}>
              <h4 style={{fontSize: '0.9rem', marginBottom: '8px'}}>O que acontece agora?</h4>
              <ul style={{fontSize: '0.85rem', color: var(--text-muted), paddingLeft: '20px', lineHeight: '1.6'}}>
                <li>Análise técnica dos documentos.</li>
                <li>Ativação do seu perfil no mapa.</li>
                <li>Você receberá uma notificação quando for aprovado.</li>
              </ul>
            </div>

            <button className="btn-onboarding btn-next" onClick={() => navigate('/motorista/dashboard')}>
              Ir para o Painel
            </button>
          </div>
        )}
      </main>

      <footer style={{textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.75rem', position: 'relative', zindex: 1}}>
        Zomp &copy; 2026 - Todos os direitos reservados
      </footer>
    </div>
  )
}
