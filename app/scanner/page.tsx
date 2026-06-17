'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { searchByISBN, type BookData } from '@/lib/book-api'

export default function ScannerPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scanning, setScanning] = useState(false)
  const [bookData, setBookData] = useState<BookData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')

  // Request camera permission
  useEffect(() => {
    const requestCamera = async () => {
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' })
        setCameraPermission(permissions.state as any)

        if (videoRef.current && permissions.state === 'granted') {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          videoRef.current.srcObject = stream
          setScanning(true)
        }
      } catch (err) {
        console.error('[v0] Camera error:', err)
        setCameraPermission('denied')
      }
    }

    requestCamera()

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setScanning(true)
        setCameraPermission('granted')
      }
    } catch (err) {
      console.error('[v0] Camera error:', err)
      setError('Não foi possível acessar a câmera')
      setCameraPermission('denied')
    }
  }

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const context = canvasRef.current.getContext('2d')
    if (!context) return

    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    context.drawImage(videoRef.current, 0, 0)

    // Try to decode barcode using canvas image
    setLoading(true)
    setError(null)

    try {
      // For now, we'll use a simple manual ISBN input approach
      // In production, you'd use a barcode scanning library like jsQR or ZXing
      setError('Scanner não implementado. Use a busca manual.')
    } catch (err) {
      setError('Erro ao processar código de barras')
    } finally {
      setLoading(false)
    }
  }

  const handleManualISBN = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const isbn = formData.get('isbn') as string

    if (!isbn || isbn.length < 10) {
      setError('ISBN inválido')
      return
    }

    setLoading(true)
    setError(null)

    const book = await searchByISBN(isbn.replace(/[^0-9]/g, ''))
    if (book) {
      setBookData(book)
      setScanning(false)
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(track => track.stop())
      }
    } else {
      setError('Livro não encontrado. Tente outro ISBN ou busque manualmente.')
    }

    setLoading(false)
  }

  // Show book confirmation if found
  if (bookData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Link href="/">
            <Button variant="outline" className="mb-6">
              ← Voltar
            </Button>
          </Link>

          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Confirmar Livro</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Book Cover */}
              <div className="flex justify-center">
                <img
                  src={bookData.capaUrl}
                  alt={bookData.titulo}
                  className="w-full max-w-xs h-auto object-cover rounded-lg shadow-lg"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement
                    img.src = '/default-book-cover.png'
                  }}
                />
              </div>

              {/* Book Details */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Título
                  </label>
                  <p className="text-lg font-semibold">{bookData.titulo}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Autor
                  </label>
                  <p className="text-lg">{bookData.autor}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Editora
                  </label>
                  <p className="text-lg">{bookData.editora}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Data de Publicação
                  </label>
                  <p className="text-lg">{bookData.dataPublicacao}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    ISBN
                  </label>
                  <p className="text-lg font-mono">{bookData.isbn}</p>
                </div>

                {bookData.descricao && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Descrição
                    </label>
                    <p className="text-sm line-clamp-4">{bookData.descricao}</p>
                  </div>
                )}

                <div className="flex gap-4 pt-6">
                  <Button
                    onClick={() => {
                      setBookData(null)
                      setScanning(true)
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => router.push('/confirm?book=' + encodeURIComponent(JSON.stringify(bookData)))}
                    className="flex-1"
                  >
                    Confirmar e Salvar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Camera/Manual Input View
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="outline" className="mb-6">
            ← Voltar
          </Button>
        </Link>

        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Adicionar Livro</h1>

          {/* Camera View */}
          <div className="mb-8">
            <div className="relative bg-card rounded-lg overflow-hidden border">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-96 object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {scanning && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-primary rounded-lg opacity-50"></div>
                </div>
              )}
            </div>

            {cameraPermission === 'granted' && scanning && (
              <Button
                onClick={captureFrame}
                className="w-full mt-4"
                disabled={loading}
              >
                {loading ? 'Processando...' : 'Capturar Código de Barras'}
              </Button>
            )}

            {cameraPermission === 'denied' && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
                <p className="text-sm font-medium">Permissão de câmera negada</p>
                <Button
                  onClick={startCamera}
                  variant="outline"
                  className="mt-3"
                >
                  Tentar Novamente
                </Button>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* OR Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">
                ou
              </span>
            </div>
          </div>

          {/* Manual ISBN Input */}
          <form onSubmit={handleManualISBN} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Inserir ISBN Manualmente
              </label>
              <input
                type="text"
                name="isbn"
                placeholder="Ex: 978-8535929706"
                className="w-full px-4 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                ISBN de 10 ou 13 dígitos (hífens opcionais)
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar Livro'}
            </Button>
          </form>

          {/* Alternative: Manual Search */}
          <div className="mt-8 pt-8 border-t">
            <Link href="/search">
              <Button variant="outline" className="w-full">
                Buscar Manualmente por Título/Autor →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
