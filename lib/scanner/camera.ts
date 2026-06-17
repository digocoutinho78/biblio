import { BrowserMultiFormatReader } from '@zxing/browser'

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

/**
 * Deve ser chamado de forma síncrona dentro do handler de toque/clique,
 * antes de qualquer await — requisito do iOS Safari.
 */
export function requestCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error('NO_MEDIA_DEVICES'))
  }

  const mobileConstraints: MediaStreamConstraints[] = [
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

  const attempts = isMobileBrowser() ? mobileConstraints : desktopConstraints

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
    const rearCamera = devices.find((device) =>
      /back|rear|environment|traseira|wide/i.test(device.label),
    )

    if (!rearCamera?.deviceId) {
      return null
    }

    const trackSettings = currentStream.getVideoTracks()[0]?.getSettings()
    if (trackSettings?.deviceId === rearCamera.deviceId) {
      return null
    }

    return await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: rearCamera.deviceId } },
      audio: false,
    })
  } catch {
    return null
  }
}

export async function attachStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
): Promise<void> {
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
  video.muted = true
  video.playsInline = true
  video.srcObject = stream

  await new Promise<void>((resolve) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      resolve()
      return
    }

    video.addEventListener('loadedmetadata', () => resolve(), { once: true })
  })

  await video.play().catch(() => {
    // iOS pode exigir gesto; o play() após toque costuma funcionar.
  })
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
        message: isIosSafari()
          ? 'Câmera bloqueada. Vá em Ajustes → Safari → Câmera → Perguntar, ou toque em "aA" na barra de endereço → Configurações do site → Câmera → Permitir.'
          : 'Permissão negada. Toque em "Permitir câmera" ou libere o acesso nas configurações do site (ícone de cadeado na barra de endereço).',
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
        message: 'A câmera está em uso por outro app. Feche-o e tente de novo.',
        denied: false,
      }
    }
  }

  if (error instanceof Error && error.message === 'NO_MEDIA_DEVICES') {
    return {
      message: 'Seu navegador não suporta câmera. Use Chrome ou Safari atualizado.',
      denied: false,
    }
  }

  return {
    message: 'Não foi possível acessar a câmera.',
    denied: false,
  }
}
