import { useState, useCallback, useRef, useEffect } from 'react'

const P = { bg: '#0a0e17', card: '#0d1220', border: '#141c2e', accent: '#00d4ff', dim: '#4a5568', text: '#c8d6e5', font: "'JetBrains Mono', monospace" }

interface VoiceControlProps {
  onCommand: (command: string) => void
  briefingText?: string
}

export function VoiceControl({ onCommand, briefingText }: VoiceControlProps) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const recognitionRef = useRef<any>(null)

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { setTranscript('Speech recognition not supported'); return }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1]
      const text = result[0].transcript
      setTranscript(text)
      if (result.isFinal) {
        onCommand(text)
        setListening(false)
      }
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [onCommand])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const speakBriefing = useCallback(() => {
    if (!briefingText) return
    const utterance = new SpeechSynthesisUtterance(briefingText)
    utterance.rate = 1.0
    utterance.pitch = 0.9
    utterance.onend = () => setSpeaking(false)
    setSpeaking(true)
    speechSynthesis.speak(utterance)
  }, [briefingText])

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  // Cleanup on unmount — stop speech and recognition
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop() } catch {}
      try { speechSynthesis.cancel() } catch {}
    }
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <button onClick={listening ? stopListening : startListening} title="Voice command"
        style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: listening ? '#ff3b5c20' : `${P.accent}10`,
          border: `1px solid ${listening ? '#ff3b5c' : P.border}`,
          color: listening ? '#ff3b5c' : P.accent,
          fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: listening ? 'pulse 1.5s infinite' : 'none',
        }}>🎙</button>

      {briefingText && (
        <button onClick={speaking ? stopSpeaking : speakBriefing} title={speaking ? 'Stop reading' : 'Read briefing aloud'}
          style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: speaking ? '#00e67620' : `${P.accent}10`,
            border: `1px solid ${speaking ? '#00e676' : P.border}`,
            color: speaking ? '#00e676' : P.accent,
            fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{speaking ? '⏹' : '🔊'}</button>
      )}

      {transcript && <span style={{ fontSize: '9px', color: P.dim, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{transcript}</span>}
    </div>
  )
}
