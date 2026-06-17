'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { searchByISBN, bookDataToLivroInsert, type BookData } from '@/lib/book-api'
import {
  attachStreamToVideo,
  getCameraErrorMessage,
  getCameraPermissionHint,
  pickRearCameraStream,
  requestCameraStream,
  syncCameraPermissionState,
} from '@/lib/scanner/camera'
import { createClient } from '@/lib/supabase/client'

export default function ScannerPage() {
  const router = useRouter()
  const supabase = createClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processingRef = useRef(false)

  const [scanning, setScanning] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [needsUserTap, setNeedsUserTap] = useState(true)
  const [bookData, setBookData] = useState<BookData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [cameraPermission, setCameraPermission] = useState<
    'granted' | 'denied' | 'prompt'
  >('prompt')
  const [requestingPermission, setRequestingPermission] = useState(false)

  const stopCamera = useCallback(async () => {
    scannerControlsRef.current?.stop()
    scannerControlsRef.current = null

    try {
      ;(readerRef.current as { reset?: () => void } | null)?.reset?.()
    } catch {
      // reset pode não existir em todas as versões do ZXing
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraActive(false)
    setScanning(false)
    setNeedsUserTap(true)
    processingRef.current = false
  }, [])

  const startScanning = useCallback(
    async (
      reader: BrowserMultiFormatReader,
      video: HTMLVideoElement,
      stream: MediaStream,
    ) => {
      const onDecode = async (
        result: { getText: () => string } | undefined,
        decodeError: unknown,
      ) => {
        if (result && !processingRef.current) {
          processingRef.current = true
          const isbn = result.getText()
          navigator.vibrate?.(200)
          await stopCamera()
          await fetchBookRef.current?.(isbn)
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

      scannerControlsRef.current = await reader.decodeFromStream(
        stream,
        video,
        onDecode,
      )
    },
    [stopCamera],
  )

  const fetchBookRef = useRef<
    ((rawIsbn: string, restartCameraOnError?: boolean) => Promise<void>) | null
  >(null)

  const fetchBook = useCallback(
    async (rawIsbn: string, restartCameraOnError = false) => {
      const isbn = rawIsbn.replace(/[^0-9Xx]/g, '')

      setLoading(true)
      setError(null)

      try {
        if (isbn.length < 10) {
          setStatusMsg(null)
          setError(`ISBN inválido (${isbn || 'vazio'}). Use 10 ou 13 dígitos.`)
          if (restartCameraOnError) {
            setNeedsUserTap(true)
          }
          return
        }

        setStatusMsg(`ISBN detectado: ${isbn} — buscando livro...`)

        const book = await searchByISBN(isbn)

        setStatusMsg(
          `Resultado da API: ${book ? book.titulo : 'não encontrado'}`,
        )

        if (!book) {
          setError(
            'Livro não encontrado nas APIs. Toque em "Permitir câmera" para escanear outro.',
          )
          setNeedsUserTap(true)
          return
        }

        setStatusMsg('Verificando se o livro já está na estante...')

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          setStatusMsg(null)
          setError('Faça login para adicionar livros à sua estante.')
          setNeedsUserTap(true)
          return
        }

        const { data: existente, error: dupError } = await supabase
          .from('livros')
          .select('id')
          .eq('user_id', user.id)
          .eq('isbn', isbn)
          .maybeSingle()

        if (dupError) {
          console.error('[scanner] Erro duplicata:', dupError)
          setStatusMsg(null)
          setError(`Erro ao verificar duplicata: ${dupError.message}`)
          setNeedsUserTap(true)
          return
        }

        setStatusMsg('Verificação Supabase concluída')

        if (existente) {
          setError('Este livro já está na sua estante')
          setBookData(null)
          setNeedsUserTap(true)
          return
        }

        setStatusMsg(null)
        setBookData(book)
      } catch (err) {
        console.error('[scanner] fetchBook error:', err)
        setStatusMsg(null)
        setError(
          err instanceof Error
            ? `Erro ao buscar livro: ${err.message}`
            : 'Erro inesperado ao buscar livro',
        )
        setNeedsUserTap(true)
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  fetchBookRef.current = fetchBook

  const activateCamera = useCallback(async (streamPromise: Promise<MediaStream>) => {
    try {
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader()
      }

      const video = videoRef.current
      if (!video) {
        return
      }

      await stopCamera()

      let stream = await streamPromise

      const rearStream = await pickRearCameraStream(stream)
      if (rearStream) {
        stream.getTracks().forEach((track) => track.stop())
        stream = rearStream
      }

      streamRef.current = stream
      await attachStreamToVideo(video, stream)

      setCameraPermission('granted')
      setCameraActive(true)
      setScanning(true)
      setNeedsUserTap(false)

      await startScanning(readerRef.current, video, stream)
    } catch (err) {
      console.error('[scanner] Camera error:', err)
      await stopCamera()

      const { message, denied } = getCameraErrorMessage(err)
      setError(message)
      setCameraPermission(denied ? 'denied' : 'prompt')
      setNeedsUserTap(true)
    } finally {
      setRequestingPermission(false)
    }
  }, [startScanning, stopCamera])

  /**
   * Handler de toque — dispara getUserMedia de forma síncrona (obrigatório no iOS).
   */
  const handleEnableCamera = useCallback(() => {
    if (requestingPermission || cameraActive) {
      return
    }

    if (!window.isSecureContext) {
      setError(
        'A câmera no celular só funciona via HTTPS. Abra o link https:// do app na Vercel.',
      )
      return
    }

    setRequestingPermission(true)
    setError(null)
    processingRef.current = false

    const streamPromise = requestCameraStream()
    void activateCamera(streamPromise)
  }, [activateCamera, cameraActive, requestingPermission])

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader()

    void syncCameraPermissionState().then(setCameraPermission)

    const onVisibilityChange = () => {
      if (document.hidden) {
        void stopCamera()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void stopCamera()
      readerRef.current = null
    }
  }, [stopCamera])

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

      const { error: insertError } = await supabase
        .from('livros')
        .insert(bookDataToLivroInsert(bookData, user.id))

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

  if (bookData) {
    return (
      <div className="min-h-[100dvh] bg-background pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="container mx-auto px-4 py-6">
          <Link href="/">
            <Button variant="outline" className="mb-4 min-h-11">
              ← Voltar
            </Button>
          </Link>

          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Confirmar Livro</h1>

            <div className="grid grid-cols-1 gap-6">
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

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setBookData(null)
                      setError(null)
                      setStatusMsg(null)
                      setNeedsUserTap(true)
                    }}
                    variant="outline"
                    className="flex-1 min-h-12"
                    disabled={saving}
                  >
                    Escanear outro
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveBook}
                    className="flex-1 min-h-12"
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

  return (
    <div className="min-h-[100dvh] bg-background pb-[max(1rem,env(safe-area-inset-bottom))] overscroll-y-contain">
      <div className="container mx-auto px-4 py-4">
        <Link href="/">
          <Button variant="outline" className="mb-4 min-h-11">
            ← Voltar
          </Button>
        </Link>

        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Adicionar Livro</h1>

          <div className="mb-6">
            <div className="relative bg-black rounded-xl overflow-hidden border aspect-[3/4] max-h-[55dvh] w-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                disablePictureInPicture
                className="absolute inset-0 h-full w-full object-cover"
              />

              {needsUserTap && !cameraActive && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/95 px-5 text-center">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {getCameraPermissionHint(cameraPermission === 'denied')}
                  </p>
                  <Button
                    type="button"
                    onClick={handleEnableCamera}
                    disabled={requestingPermission}
                    className="min-h-12 px-8 text-base touch-manipulation"
                  >
                    {requestingPermission
                      ? 'Abrindo câmera...'
                      : cameraPermission === 'denied'
                        ? 'Tentar novamente'
                        : 'Permitir câmera'}
                  </Button>
                </div>
              )}

              {cameraActive && scanning && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-36 border-4 border-primary rounded-lg opacity-70" />
                  <p className="absolute bottom-4 inset-x-0 text-center text-xs text-white drop-shadow-md px-4">
                    Alinhe o código de barras dentro da moldura
                  </p>
                </div>
              )}
            </div>

            {statusMsg && (
              <p className="mt-3 text-center text-sm text-primary font-medium px-2">
                {statusMsg}
              </p>
            )}

            {(cameraActive && scanning) || loading ? (
              !statusMsg && (
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  {loading ? 'Buscando livro...' : 'Escaneando automaticamente...'}
                </p>
              )
            ) : null}

            {error && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
                <p className="text-sm">{error}</p>
                {needsUserTap && !cameraActive && (
                  <Button
                    type="button"
                    onClick={handleEnableCamera}
                    variant="outline"
                    className="mt-3 w-full min-h-11 touch-manipulation"
                    disabled={requestingPermission}
                  >
                    {requestingPermission ? 'Abrindo câmera...' : 'Permitir câmera'}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">ou</span>
            </div>
          </div>

          <form onSubmit={handleManualISBN} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Inserir ISBN manualmente
              </label>
              <input
                type="text"
                name="isbn"
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="search"
                placeholder="Ex: 9788535929706"
                className="w-full min-h-12 px-4 py-2 text-base border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                ISBN de 10 ou 13 dígitos
              </p>
            </div>

            <Button type="submit" className="w-full min-h-12 text-base" disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar Livro'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <Link href="/search">
              <Button variant="outline" className="w-full min-h-12">
                Buscar por título ou autor →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
