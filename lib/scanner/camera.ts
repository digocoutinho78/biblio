import { BrowserMultiFormatReader } from '@zxing/browser'

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }

  return /Android/i.test(navigator.userAgent)
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }

  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }

  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    /Safari/i.test(navigator.userAgent) &&
    !/CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent)
  )
}

function isFrontCamera(label: string): boolean {
  return /front|user|selfie|facetime|frontal|facing front/i.test(label)
}

function isBackCamera(label: string): boolean {
  if (isFrontCamera(label)) {
    return false
  }

  return /back|rear|environment|traseira|posterior|facing back|camera2 0|camera 0/i.test(
    label,
  )
}

function rankBackCamera(device: MediaDeviceInfo): number {
  const label = device.label.toLowerCase()

  if (isFrontCamera(label)) {
    return -1
  }

  if (/back|rear|environment|traseira|posterior|facing back/.test(label)) {
    return 100
  }

  // Evita lente ultra-wide no Android — foco pior para código de barras
  if (/ultra|0\.6|macro|wide-angle/.test(label)) {
    return 10
  }

  if (/wide|tele|zoom/.test(label)) {
    return 20
  }

  // Samsung/Xiaomi costumam rotular como "camera 0" a traseira principal
  if (/camera 0|camera2 0|0, facing back/.test(label)) {
    return 80
  }

  return isAndroid() ? 30 : 0
}

/**
 * Deve ser chamado de forma síncrona dentro do handler de toque/clique,
 * antes de qualquer await — requisito do iOS Safari; recomendado no Android também.
 */
export function requestCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'))
  }

  const androidConstraints: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { exact: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    },
    {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    {
      video: { facingMode: 'environment' },
      audio: false,
    },
    {
      video: true,
      audio: false,
    },
  ]

  const iosConstraints: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    {
      video: { facingMode: 'environment' },
      audio: false,
    },
    {
      video: true,
      audio: false,
    },
  ]

  const desktopConstraints: MediaStreamConstraints[] = [
    {
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    },
    {
      video: true,
      audio: false,
    },
  ]

  const attempts = isAndroid()
    ? androidConstraints
    : isMobileBrowser()
      ? iosConstraints
      : desktopConstraints

  return attempts.reduce<Promise<MediaStream>>(
    (chain, constraints) =>
      chain.catch(() => navigator.mediaDevices.getUserMedia(constraints)),
    Promise.reject(new Error('NO_ATTEMPTS')),
  )
}

export async function pickRearCameraStream(
  currentStream: MediaStream,
): Promise<MediaStream | null> {
  try {
    const devices = await BrowserMultiFormatReader.listVideoInputDevices()
    const rearCameras = devices
      .filter((device) => rankBackCamera(device) > 0)
      .sort((a, b) => rankBackCamera(b) - rankBackCamera(a))

    const rearCamera = rearCameras[0]

    if (!rearCamera?.deviceId) {
      return null
    }

    const trackSettings = currentStream.getVideoTracks()[0]?.getSettings()
    if (trackSettings?.deviceId === rearCamera.deviceId) {
      return null
    }

    return await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: rearCamera.deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    })
  } catch {
    return null
  }
}

export async function applyBarcodeAutofocus(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0]
  if (!track) {
    return
  }

  const capabilities = track.getCapabilities?.()
  const focusModes = capabilities?.focusMode

  if (!focusModes?.length) {
    return
  }

  const focusMode = focusModes.includes('continuous')
    ? 'continuous'
    : focusModes.includes('auto')
      ? 'auto'
      : null

  if (!focusMode) {
    return
  }

  try {
    await track.applyConstraints({
      advanced: [{ focusMode }],
    })
  } catch {
    // Nem todo Android expõe focusMode via applyConstraints
  }
}

export async function attachStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
): Promise<void> {
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
  video.setAttribute('autoplay', 'true')
  video.muted = true
  video.playsInline = true
  video.srcObject = stream

  await new Promise<void>((resolve) => {
    const done = () => resolve()

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      done()
      return
    }

    video.addEventListener('loadeddata', done, { once: true })
    video.addEventListener('loadedmetadata', done, { once: true })

    // Fallback para Chrome Android com preview preto
    window.setTimeout(done, isAndroid() ? 1500 : 800)
  })

  await video.play().catch(() => {
    // play() após toque costuma funcionar em iOS e Android
  })

  await applyBarcodeAutofocus(stream)
}

export function getCameraPermissionHint(denied: boolean): string {
  if (!denied) {
    return isAndroid()
      ? 'Aponte a câmera traseira para o código de barras e toque abaixo.'
      : 'Aponte para o código de barras do livro. Toque abaixo para ativar a câmera traseira.'
  }

  if (isIosSafari()) {
    return 'Câmera bloqueada. Toque em "aA" na barra do Safari → Configurações do site → Câmera → Permitir.'
  }

  if (isAndroid()) {
    return 'Câmera bloqueada. No Chrome: toque em ⋮ → Configurações do site → Câmera → Permitir. Depois toque em "Tentar novamente".'
  }

  return 'Câmera bloqueada. Toque no cadeado na barra de endereço → Câmera → Permitir.'
}

export function getCameraErrorMessage(error: unknown): {
  message: string
  denied: boolean
} {
  if (error instanceof DOMException) {
    if (
      error.name === 'NotAllowedError' ||
      error.name === 'PermissionDeniedError'
    ) {
      return {
        message: getCameraPermissionHint(true),
        denied: true,
      }
    }

    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return {
        message: 'Nenhuma câmera encontrada neste aparelho.',
        denied: false,
      }
    }

    if (error.name === 'NotReadableError') {
      return {
        message: isAndroid()
          ? 'A câmera está em uso. Feche outros apps (WhatsApp, Câmera) e tente de novo.'
          : 'A câmera está em uso por outro app. Feche-o e tente de novo.',
        denied: false,
      }
    }

    if (error.name === 'OverconstrainedError') {
      return {
        message: 'Não foi possível usar a câmera traseira. Tentando câmera alternativa...',
        denied: false,
      }
    }
  }

  if (error instanceof Error && error.message === 'NO_MEDIA_DEVICES') {
    return {
      message: isAndroid()
        ? 'Use o Chrome atualizado no Android para escanear códigos de barras.'
        : 'Seu navegador não suporta câmera. Use Chrome ou Safari atualizado.',
      denied: false,
    }
  }

  return {
    message: 'Não foi possível acessar a câmera.',
    denied: false,
  }
}

export async function syncCameraPermissionState(): Promise<
  'granted' | 'denied' | 'prompt'
> {
  try {
    if (!navigator.permissions?.query) {
      return 'prompt'
    }

    const status = await navigator.permissions.query({
      name: 'camera' as PermissionName,
    })
    return status.state as 'granted' | 'denied' | 'prompt'
  } catch {
    return 'prompt'
  }
}
