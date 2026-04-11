import { getConfig } from './config'

function getApiBaseUrl(): string {
  try { return getConfig().apiUrl } catch { return import.meta.env.VITE_API_URL || 'http://localhost:5100' }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>
}

class ApiClient {
  private getBaseUrl: () => string
  private getToken: (() => Promise<string | null>) | null = null

  constructor(getBaseUrl: () => string) {
    this.getBaseUrl = getBaseUrl
  }

  setTokenProvider(provider: () => Promise<string | null>) {
    this.getToken = provider
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options

    let url = `${this.getBaseUrl()}${path}`
    if (params) {
      const searchParams = new URLSearchParams(params)
      url += `?${searchParams.toString()}`
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    }

    if (this.getToken) {
      const token = await this.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new ApiError(response.status, error.message || 'Request failed')
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') return {} as T
    const text = await response.text()
    if (!text) return {} as T
    return JSON.parse(text)
  }

  get<T>(path: string, params?: Record<string, string>) {
    return this.request<T>(path, { method: 'GET', params })
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) })
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  }

  async downloadBlob(path: string): Promise<Blob> {
    const url = `${this.getBaseUrl()}${path}`
    const headers: Record<string, string> = {}
    if (this.getToken) {
      const token = await this.getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(url, { headers })
    if (!response.ok) throw new ApiError(response.status, 'Download failed')
    return response.blob()
  }

  async upload<T>(path: string, file: File, onProgress?: (percent: number) => void): Promise<T> {
    const url = `${this.getBaseUrl()}${path}`
    const formData = new FormData()
    formData.append('file', file)

    const headers: Record<string, string> = {}
    if (this.getToken) {
      const token = await this.getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }

    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText))
        } else {
          try {
            const err = JSON.parse(xhr.responseText)
            reject(new ApiError(xhr.status, err.message || 'Upload failed'))
          } catch {
            reject(new ApiError(xhr.status, 'Upload failed'))
          }
        }
      }
      xhr.onerror = () => reject(new ApiError(0, 'Network error'))
      xhr.send(formData)
    })
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export const api = new ApiClient(getApiBaseUrl)
