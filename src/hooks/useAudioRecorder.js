import { useState, useRef, useCallback, useEffect } from 'react'

const MAX_DURATION = 10 // seconds

/**
 * Hook for recording audio from the microphone.
 * Returns base64-encoded audio after recording stops.
 */
export default function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [error, setError] = useState(null)
  const [audioBase64, setAudioBase64] = useState(null)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup])

  const startRecording = useCallback(async () => {
    setError(null)
    setAudioBase64(null)
    setSecondsElapsed(0)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/mp4',
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        const reader = new FileReader()
        reader.onloadend = () => {
          // Strip data URL prefix to get raw base64
          const base64 = reader.result.split(',')[1]
          setAudioBase64(base64)
        }
        reader.readAsDataURL(blob)
        cleanup()
      }

      mediaRecorder.start(1000) // collect data every second
      setIsRecording(true)

      // Countdown timer
      let elapsed = 0
      timerRef.current = setInterval(() => {
        elapsed++
        setSecondsElapsed(elapsed)
        if (elapsed >= MAX_DURATION) {
          mediaRecorder.stop()
          setIsRecording(false)
        }
      }, 1000)
    } catch (err) {
      cleanup()
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access was denied. Please allow mic access and try again.')
      } else {
        setError('Could not access microphone. Please check your device settings.')
      }
    }
  }, [cleanup])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [])

  const reset = useCallback(() => {
    cleanup()
    setIsRecording(false)
    setSecondsElapsed(0)
    setError(null)
    setAudioBase64(null)
  }, [cleanup])

  return {
    startRecording,
    stopRecording,
    reset,
    isRecording,
    secondsElapsed,
    error,
    audioBase64,
    maxDuration: MAX_DURATION,
  }
}
