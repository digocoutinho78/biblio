'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { searchByISBN, type BookData } from '@/lib/book-api'
import { createClient } from '@/lib/supabase/client'

const REAR_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: { exact: 'environment' } },
}

const FALLBACK_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: { ideal: 'environment' } },
}

export default function ScannerPage() {
  const router = useRouter()
  const supabase = createClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null)
  const processingRef = useRef(false)

  const [scanning, setScanning] = useState(false)
  const [bookData, setBookData] = useState<BookData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraPermission, setCameraPermission] = useState<
    'granted' | 'denied' | 'prompt'
  >('prompt')
  const [requestingPermission, setRequestingPermission] = useState(false)

  const syncCameraPermission = useCallback(async () => {
    try {
      if (!navigator.permissions?.query) {
        return 'prompt' as const
      }

      const status = await navigator.permissions.query({
        name: 'camera' as PermissionName,
      })
      return status.state as 'granted' | 'denied' | 'prompt'
    } catch {
      return 'prompt' as const
    }
  }, [])

  const stopCamera = useCallback(async () => {
    scannerControlsRef.current?.stop()
    scannerControlsRef.current = null
    readerRef.current?.reset()

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }

    setScanning(false)
    processingRef.current = false
  }, [])

  const startCameraRef = useRef<(() => Promise<void>) | null>(null)

  const fetchBook = useCallback(
    async (rawIsbn: string, restartCameraOnError = true) => {
      const isbn = rawIsbn.replace(/[^0-9Xx]/g, '')

      if (isbn.length < 10) {
        setError('ISBN inválido')
        if (restartCameraOnError) {
          await startCameraRef.current?.()
        }
        return
      }

      setLoading(true)
      setError(null)

      const book = await searchByISBN(isbn)

      if (!book) {
        setError('Livro não encontrado. Tente outro ISBN ou busque manualmente.')
        setLoading(false)
        if (restartCameraOnError) {
          await startCameraRef.current?.()
        }
        return
      }

      const { data: existente } = await supabase
        .from('livros')
        .select('id')
        .eq('isbn', isbn)
        .maybeSingle()

      if (existente) {
        setError('Este livro já está na sua estante')
        setBookData(null)
        setLoading(false)
        if (restartCameraOnError) {
          await startCameraRef.current?.()
        }
        return
      }

      setBookData(book)
      setLoading(false)
    },
    [supabase],
  )

  const startScanning = useCallback(
    async (reader: BrowserMultiFormatReader, video: HTMLVideoElement) => {
      const onDecode = async (
        result: { getText: () => string } | undefined,
        decodeError: unknown,
      ) => {
        if (result && !processingRef.current) {
          processingRef.current = true
          const isbn = result.getText()
          navigator.vibrate?.(200)
          await stopCamera()
          await fetchBook(isbn)
          return
        }

        if (
          decodeError &&
          !(decodeError instanceof NotFoundException) &&
          !(decodeError as Error)?.name?.includes('NotFoundException')
        ) {
          console.error('[scanner] decode error:', decodeError)
        }
      }

      try {
        scannerControlsRef.current = await reader.decodeFromConstraints(
          REAR_CAMERA_CONSTRAINTS,
          video,
          onDecode,
        )
      } catch {
        scannerControlsRef.current = await reader.decodeFromConstraints(
          FALLBACK_CAMERA_CONSTRAINTS,
          video,
          onDecode,
        )
      }
    },
    [fetchBook, stopCamera],
  )

  const startCamera = useCallback(async () => {
    try {
      setRequestingPermission(true)
      setError(null)
      processingRef.current = false

      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader()
      }

      const video = videoRef.current
      if (!video) {
        return
      }

      await stopCamera()

      // Solicita permissão explicitamente antes do ZXing iniciar o stream
      try {
        const testStream = await navigator.mediaDevices.getUserMedia(
          FALLBACK_CAMERA_CONSTRAINTS,
        )
        testStream.getTracks().forEach((track) => track.stop())
      } catch (permissionError) {
        const isDenied =
          permissionError instanceof DOMException &&
          (permissionError.name === 'NotAllowedError' ||
            permissionError.name === 'PermissionDeniedError')

        setCameraPermission('denied')
        setScanning(false)
        setError(
          isDenied
            ? 'Permissão de câmera negada. Toque em "Permitir câmera" para solicitar novamente ou libere o acesso nas configurações do navegador.'
            : 'Não foi possível acessar a câmera',
        )
        return
      }

      setCameraPermission('granted')
      setScanning(true)
      await startScanning(readerRef.current, video)
    } catch (err) {
      console.error('[scanner] Camera error:', err)
      setError('Não foi possível acessar a câmera')
      setCameraPermission('denied')
      setScanning(false)
    } finally {
      setRequestingPermission(false)
    }
  }, [startScanning, stopCamera])

  startCameraRef.current = startCamera

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader()

    let permissionStatus: PermissionStatus | null = null

    void (async () => {
      const state = await syncCameraPermission()
      setCameraPermission(state)

      if (state === 'granted') {
        await startCameraRef.current?.()
      }
    })()

    navigator.permissions
      ?.query({ name: 'camera' as PermissionName })
      .then((status) => {
        permissionStatus = status
        status.onchange = () => {
          const nextState = status.state as 'granted' | 'denied' | 'prompt'
          setCameraPermission(nextState)

          if (nextState === 'granted') {
            void startCameraRef.current?.()
          } else if (nextState === 'denied') {
            void stopCamera()
          }
        }
      })
      .catch(() => {})

    return () => {
      if (permissionStatus) {
        permissionStatus.onchange = null
      }
      void stopCamera()
      readerRef.current = null
    }
  }, [stopCamera, syncCameraPermission])

  const handleManualISBN = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const isbn = formData.get('isbn') as string

    await stopCamera()
    await fetchBook(isbn, false)
  }

  const handleSaveBook = async () => {
    if (!bookData) return

    setSaving(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { error: insertError } = await supabase.from('livros').insert({
        user_id: user.id,
        isbn: bookData.isbn,
        titulo: bookData.titulo,
        autor: bookData.autor,
        editora: bookData.editora,
        descricao: bookData.descricao,
        capa_url: bookData.capaUrl,
        data_publicacao: bookData.dataPublicacao || null,
      })

      if (insertError) {
        setError('Erro ao salvar livro: ' + insertError.message)
        return
      }

      router.push('/')
    } catch (err) {
      console.error('[scanner] Save error:', err)
      setError('Erro ao salvar livro')
    } finally {
      setSaving(false)
    }
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

                {error && (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-4 pt-6">
                  <Button
                    onClick={async () => {
                      setBookData(null)
                      setError(null)
                      await startCamera()
                    }}
                    variant="outline"
                    className="flex-1"
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveBook}
                    className="flex-1"
                    disabled={saving}
                  >
                    {saving ? 'Salvando...' : 'Confirmar e Salvar'}
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
                muted
                className="w-full h-96 object-cover"
              />

              {!scanning && cameraPermission !== 'granted' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/90 px-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {cameraPermission === 'denied'
                      ? 'O acesso à câmera foi negado. Solicite a permissão novamente para escanear o código de barras.'
                      : 'Permita o acesso à câmera para escanear o código de barras do livro.'}
                  </p>
                  <Button
                    onClick={startCamera}
                    disabled={requestingPermission}
                  >
                    {requestingPermission
                      ? 'Solicitando permissão...'
                      : cameraPermission === 'denied'
                        ? 'Solicitar permissão novamente'
                        : 'Permitir câmera'}
                  </Button>
                </div>
              )}

              {scanning && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-primary rounded-lg opacity-50"></div>
                </div>
              )}
            </div>

            {cameraPermission === 'granted' && scanning && (
              <Button className="w-full mt-4" disabled={loading || requestingPermission}>
                {loading ? 'Processando...' : 'Escaneando...'}
              </Button>
            )}

            {cameraPermission === 'denied' && !scanning && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
                <p className="text-sm font-medium">Permissão de câmera negada</p>
                <p className="text-xs mt-1">
                  Se o navegador não exibir o pedido de permissão, libere a câmera
                  nas configurações do site.
                </p>
                <Button
                  onClick={startCamera}
                  variant="outline"
                  className="mt-3"
                  disabled={requestingPermission}
                >
                  {requestingPermission
                    ? 'Solicitando permissão...'
                    : 'Solicitar permissão novamente'}
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
