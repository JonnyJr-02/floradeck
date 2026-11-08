import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * The rear camera in a <video>. It starts on its own only once the user has allowed it, so the
 * very first opening never greets anyone with a permission prompt; after that, every visit to
 * Esplora opens the viewfinder straight away. The stream stops when the app goes to the background.
 */

export type CameraStatus =
  | 'off' // not started yet: the screen offers «Apri la fotocamera»
  | 'starting'
  | 'live'
  | 'denied' // the user (or a setting) said no
  | 'unavailable' // no camera, or no camera API in this browser

const ALLOWED_KEY = 'floradeck:camera-allowed'

function rememberAllowed(allowed: boolean) {
  try {
    if (allowed) localStorage.setItem(ALLOWED_KEY, '1')
    else localStorage.removeItem(ALLOWED_KEY)
  } catch {
    // Storage blocked: the user taps «Apri la fotocamera» each time.
  }
}

function wasAllowed(): boolean {
  try {
    return localStorage.getItem(ALLOWED_KEY) === '1'
  } catch {
    return false
  }
}

export function cameraSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const wantedRef = useRef(false)
  /** Only the latest getUserMedia call may keep its stream (StrictMode, quick taps). */
  const requestRef = useRef(0)
  const [status, setStatus] = useState<CameraStatus>(() => (cameraSupported() ? 'off' : 'unavailable'))

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const start = useCallback(async () => {
    if (!cameraSupported()) return setStatus('unavailable')
    wantedRef.current = true
    if (streamRef.current) return
    const request = ++requestRef.current
    setStatus('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } },
      })
      // The user may have left the screen (or the app) while the prompt was open.
      if (!wantedRef.current || request !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play().catch(() => undefined)
      }
      rememberAllowed(true)
      setStatus('live')
    } catch (error) {
      if (request !== requestRef.current) return
      stopTracks()
      const name = error instanceof DOMException ? error.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        rememberAllowed(false)
        setStatus('denied')
      } else {
        // NotFoundError, NotReadableError (camera busy in another app), OverconstrainedError…
        setStatus('unavailable')
      }
    }
  }, [stopTracks])

  const stop = useCallback(() => {
    wantedRef.current = false
    stopTracks()
    setStatus((current) => (current === 'live' || current === 'starting' ? 'off' : current))
  }, [stopTracks])

  // Open straight away when the camera was allowed before.
  useEffect(() => {
    if (wasAllowed()) void start()
    return () => {
      wantedRef.current = false
      requestRef.current++
      stopTracks()
    }
  }, [start, stopTracks])

  // Background: release the camera (battery, and the green dot); foreground: take it back.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (!streamRef.current) return
        stopTracks()
        setStatus('off')
        wantedRef.current = true
      } else if (wantedRef.current && !streamRef.current) {
        void start()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [start, stopTracks])

  return { videoRef, status, start, stop }
}
