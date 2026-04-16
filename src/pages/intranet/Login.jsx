import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { auth as authApi } from '../../services/api'
import toast, { Toaster } from 'react-hot-toast'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const login    = useAuthStore(s => s.login)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return toast.error('Completa todos los campos')
    setLoading(true)
    try {
      const { data } = await authApi.login(email, password)
      login(data.token, data.user)
      toast.success(`Bienvenido, ${data.user.nombre}`)
      navigate('/intranet/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Credenciales inválidas')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">
      <Toaster />
      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10"
        style={{background:'linear-gradient(160deg, #004A97 0%, #0084CB 70%)'}}>
        <div>
          <img src="/logos/LetrasSoporteCaribeBlancas.png" alt="Soporte Caribe"
            className="h-12 object-contain mb-10"
            onError={e => e.target.style.display='none'} />
          <div className="text-white text-3xl font-bold leading-snug mb-4">
            Intranet<br/>Soporte Caribe
          </div>
          <div className="text-white/60 text-base max-w-sm leading-relaxed">
            Plataforma interna para la gestión de operaciones, inventarios y servicios.
          </div>
        </div>
        <div className="text-white/40 text-sm">HP Authorized Service Center · Soporte Caribe LTDA</div>
      </div>

      {/* Panel derecho */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-[400px]">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#004A97] mb-8 transition-colors">
            <ArrowLeft size={16} /> Volver al sitio
          </button>

          <div className="lg:hidden text-center mb-8">
            <img src="/logos/LetrasSoporteCaribe.png" alt="Soporte Caribe"
              className="h-12 mx-auto object-contain mb-3"
              onError={e => e.target.style.display='none'} />
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <div className="mb-6">
              <div className="text-2xl font-bold text-gray-900 mb-1">Iniciar sesión</div>
              <div className="text-sm text-gray-500">Accede a la intranet con tus credenciales</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input className="input pl-9" type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@soportecaribe.com" required />
                </div>
              </div>
              <div>
                <label className="label">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input className="input pl-9 pr-10" type={showPwd ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? 'Verificando...' : 'Ingresar →'}
              </button>
            </form>
          </div>
          <div className="text-center mt-5 text-xs text-gray-400">Soporte Caribe LTDA · Intranet v1.0</div>
        </div>
      </div>
    </div>
  )
}
