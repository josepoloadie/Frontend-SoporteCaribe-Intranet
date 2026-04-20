import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/intranet/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────
export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
}

// ── DAAS — Equipos ───────────────────────────────
export const equipos = {
  list:       (params) => api.get('/equipos', { params }),
  get:        (id)     => api.get(`/equipos/${id}`),
  create:     (data)   => api.post('/equipos', data),
  update:     (id, d)  => api.put(`/equipos/${id}`, d),
  saveConfig: (id, d)  => api.post(`/equipos/${id}/configuracion`, d),
  archivar:   (id)     => api.put(`/equipos/${id}/archivar`),
  eliminar:   (id)     => api.delete(`/equipos/${id}`),
  delete:     (id)     => api.delete(`/equipos/${id}`),
}

// ── DAAS — Componentes ───────────────────────────
export const componentes = {
  list:             (params) => api.get('/componentes', { params }),
  get:              (id)     => api.get(`/componentes/${id}`),
  create:           (data)   => api.post('/componentes', data),
  update:           (id, d)  => api.put(`/componentes/${id}`, d),
  eliminar:         (id)     => api.delete(`/componentes/${id}`),
  delete:           (id)     => api.delete(`/componentes/${id}`),
  buscarCompat:     (pn)     => api.get(`/componentes/compatibles/${pn}`),
  actualizarEstado: (id, d)  => api.patch(`/componentes/${id}/estado`, d),
}

// ── DAAS — Movimientos ───────────────────────────
export const movimientos = {
  list:             (params) => api.get('/movimientos', { params }),
  get:              (id)     => api.get(`/movimientos/${id}`),
  create:           (data)   => api.post('/movimientos', data),
  avanzar:          (id, d)  => api.put(`/movimientos/${id}/estado`, d),
  actualizarEstado: (id, d)  => api.put(`/movimientos/${id}/estado`, d),
  instalar:         (id, d)  => api.post(`/movimientos/${id}/instalar`, d),
  recibir:          (id, d)  => api.post(`/movimientos/${id}/recibir`, d),
}

// ── DAAS — PartSurfer ────────────────────────────
export const partsurfer = {
  consultar:   (serial)     => api.get(`/partsurfer/${serial}`),
  seleccionar: (serial, pn) => api.get('/partsurfer/seleccionar', { params: { serial, product_number: pn } }),
  buscarParte: (pn)         => api.get('/partsurfer/parte', { params: { pn } }),
}

// ── DAAS — Repuestos ─────────────────────────────
export const repuestos = {
  list:   (params) => api.get('/repuestos', { params }),
  get:    (id)     => api.get(`/repuestos/${id}`),
  create: (data)   => api.post('/repuestos', data),
  update: (id, d)  => api.put(`/repuestos/${id}`, d),
  delete: (id)     => api.delete(`/repuestos/${id}`),
}

// ── DAAS — Reportes ──────────────────────────────
export const reportes = {
  get:                  (params) => api.get('/reportes', { params }),
  dashboard:            ()       => api.get('/reportes/dashboard'),
  pendientesDevolucion: ()       => api.get('/reportes/pendientes-devolucion'),
  donantesIncompletos:  ()       => api.get('/reportes/donantes-incompletos'),
  pendientesReponer:    ()       => api.get('/reportes/pendientes-reponer'),
  estatusComponentes:   ()       => api.get('/reportes/estatus-componentes'),
}

export default api