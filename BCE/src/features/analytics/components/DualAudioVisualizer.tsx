'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSmartAgentSession } from '../context/SmartAgentSessionContext';
import { Volume2, Mic, Activity, AlertTriangle } from 'lucide-react';

const NUM_BINS = 16;

export default function DualAudioVisualizer() {
  const {
    realtimeVoiceState,
    getInputAnalyserNode,
    getOutputAnalyserNode,
    getAudioDiagnostics
  } = useSmartAgentSession();

  const [agentBins, setAgentBins] = useState<number[]>(() => new Array(NUM_BINS).fill(0));
  const [inputBins, setInputBins] = useState<number[]>(() => new Array(NUM_BINS).fill(0));
  const [agentVol, setAgentVol] = useState<number>(0);
  const [inputVol, setInputVol] = useState<number>(0);
  const [agentRawRms, setAgentRawRms] = useState<number>(0);
  const [inputRawRms, setInputRawRms] = useState<number>(0);
  const [agentDb, setAgentDb] = useState<number>(-100);
  const [inputDb, setInputDb] = useState<number>(-100);

  const animFrameRef = useRef<number | null>(null);
  const lastLogTimeRef = useRef<number>(0);

  useEffect(() => {
    if (realtimeVoiceState === 'STOPPED') {
      setAgentBins(new Array(NUM_BINS).fill(0));
      setInputBins(new Array(NUM_BINS).fill(0));
      setAgentVol(0);
      setInputVol(0);
      setAgentRawRms(0);
      setInputRawRms(0);
      setAgentDb(-100);
      setInputDb(-100);
      return;
    }

    const updateAudioMeters = () => {
      const outputAnalyser = getOutputAnalyserNode();
      const inputAnalyser = getInputAnalyserNode();
      const diagnostics = getAudioDiagnostics();
      const now = Date.now();

      let currentAgentRms = 0;
      let currentAgentDb = -100;
      let currentAgentVisualVol = 0;

      let currentInputRms = 0;
      let currentInputDb = -100;
      let currentInputVisualVol = 0;

      // 1. Process Agent Output Audio (Playback stream) using real Time-Domain RMS
      if (outputAnalyser) {
        const fftSize = outputAnalyser.fftSize || 512;
        const timeBuffer = new Float32Array(fftSize);
        outputAnalyser.getFloatTimeDomainData(timeBuffer);

        let sum = 0;
        for (let i = 0; i < timeBuffer.length; i++) {
          sum += timeBuffer[i] * timeBuffer[i];
        }
        currentAgentRms = Math.sqrt(sum / timeBuffer.length);
        currentAgentDb = currentAgentRms > 0.00001 ? 20 * Math.log10(currentAgentRms) : -100;
        // Map dB (-50 dB to -10 dB) to 0-100 visual level
        currentAgentVisualVol = currentAgentRms < 0.001 
          ? 0 
          : Math.min(100, Math.max(0, Math.round(((currentAgentDb + 50) / 40) * 100)));

        const freqBuffer = new Uint8Array(NUM_BINS);
        outputAnalyser.getByteFrequencyData(freqBuffer);
        setAgentBins(Array.from(freqBuffer));
      } else {
        setAgentBins(new Array(NUM_BINS).fill(0));
      }

      setAgentVol(currentAgentVisualVol);
      setAgentRawRms(currentAgentRms);
      setAgentDb(currentAgentDb);

      // 2. Process User Input Audio (Microphone stream) using real Time-Domain RMS
      if (inputAnalyser) {
        const fftSize = inputAnalyser.fftSize || 512;
        const timeBuffer = new Float32Array(fftSize);
        inputAnalyser.getFloatTimeDomainData(timeBuffer);

        let sum = 0;
        for (let i = 0; i < timeBuffer.length; i++) {
          sum += timeBuffer[i] * timeBuffer[i];
        }
        currentInputRms = Math.sqrt(sum / timeBuffer.length);
        currentInputDb = currentInputRms > 0.00001 ? 20 * Math.log10(currentInputRms) : -100;
        // Map dB (-50 dB to -10 dB) to 0-100 visual level
        currentInputVisualVol = currentInputRms < 0.001 
          ? 0 
          : Math.min(100, Math.max(0, Math.round(((currentInputDb + 50) / 40) * 100)));

        const freqBuffer = new Uint8Array(NUM_BINS);
        inputAnalyser.getByteFrequencyData(freqBuffer);
        setInputBins(Array.from(freqBuffer));
      } else {
        setInputBins(new Array(NUM_BINS).fill(0));
      }

      setInputVol(currentInputVisualVol);
      setInputRawRms(currentInputRms);
      setInputDb(currentInputDb);

      // 3. Throttled Development-Only Debug Logging (approx once every 750ms)
      if (process.env.NODE_ENV === 'development' && now - lastLogTimeRef.current > 750) {
        lastLogTimeRef.current = now;
        console.log('[AUDIO INPUT]', {
          context: diagnostics.audioContextState,
          track: diagnostics.micTrackState,
          enabled: diagnostics.micTrackEnabled,
          rms: currentInputRms.toFixed(4),
          db: currentInputDb.toFixed(1),
          samplesActive: currentInputRms > 0.001
        });
        console.log('[AUDIO OUTPUT]', {
          context: diagnostics.audioContextState,
          playback: realtimeVoiceState === 'SPEAKING_AI',
          rms: currentAgentRms.toFixed(4),
          db: currentAgentDb.toFixed(1),
          samplesActive: currentAgentRms > 0.001
        });
      }

      animFrameRef.current = requestAnimationFrame(updateAudioMeters);
    };

    animFrameRef.current = requestAnimationFrame(updateAudioMeters);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [realtimeVoiceState, getInputAnalyserNode, getOutputAnalyserNode, getAudioDiagnostics]);

  if (realtimeVoiceState === 'STOPPED') return null;

  const diagnostics = getAudioDiagnostics();

  // Status computation for Agent Voice
  const isAgentSpeaking = agentVol > 0 || realtimeVoiceState === 'SPEAKING_AI';
  let agentStatusText = '○ SILENT';
  if (diagnostics.outputSource === 'web_speech') {
    agentStatusText = '○ Web Speech Fallback';
  } else if (isAgentSpeaking) {
    agentStatusText = '● SPEAKING';
  }

  // Status computation for Input Voice
  const isInputActive = inputVol > 0 || realtimeVoiceState === 'HEARING';
  let inputStatusText = '○ AWAITING SPEECH';
  let isInputError = false;

  if (diagnostics.silentReason === 'AUDIO_CONTEXT_SUSPENDED') {
    inputStatusText = '⚠️ AUDIO CONTEXT SUSPENDED';
    isInputError = true;
  } else if (diagnostics.silentReason === 'NO_MIC_STREAM') {
    inputStatusText = '⚠️ NO MIC STREAM';
    isInputError = true;
  } else if (diagnostics.silentReason === 'MIC_TRACK_NOT_LIVE') {
    inputStatusText = '⚠️ MIC TRACK ENDED';
    isInputError = true;
  } else if (diagnostics.silentReason === 'MIC_TRACK_DISABLED') {
    inputStatusText = '⚠️ MIC MUTED';
    isInputError = true;
  } else if (isInputActive) {
    inputStatusText = '● LISTENING';
  }

  return (
    <div
      style={{
        background: 'rgba(10, 15, 30, 0.85)',
        border: '1px solid rgba(0, 229, 255, 0.25)',
        borderRadius: '12px',
        padding: '12px 14px',
        margin: '10px 0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        backdropFilter: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      {/* HEADER BADGE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={13} style={{ color: 'var(--neon-cyan)' }} /> REAL-TIME DUAL AUDIO ANALYZER
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          Web Audio API 60FPS
        </span>
      </div>

      {/* BAR 1: AGENT VOICE / PITCH */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Volume2 size={13} /> 1. Agent Voice / Pitch
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              style={{ fontSize: '10px', color: isAgentSpeaking ? '#00e5ff' : 'var(--text-muted)' }}
              title={`Raw RMS: ${agentRawRms.toFixed(4)}, Level: ${agentDb.toFixed(1)} dB`}
            >
              {agentVol}% RMS
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '2px 8px',
              borderRadius: '10px',
              background: isAgentSpeaking ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: isAgentSpeaking ? '#00e5ff' : 'var(--text-muted)',
              border: isAgentSpeaking ? '1px solid rgba(0, 229, 255, 0.5)' : '1px solid var(--glass-border)',
              boxShadow: isAgentSpeaking ? '0 0 10px rgba(0, 229, 255, 0.3)' : 'none'
            }}>
              {agentStatusText}
            </span>
          </div>
        </div>

        {/* Spectrum Equalizer Bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '32px', gap: '3px', padding: '4px 6px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {agentBins.map((val, idx) => {
            const pct = Math.max(8, Math.min(100, (val / 255) * 100));
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: `${pct}%`,
                  background: isAgentSpeaking
                    ? `linear-gradient(to top, #00e5ff ${Math.min(100, pct)}%, #a855f7 100%)`
                    : 'rgba(0, 229, 255, 0.12)',
                  borderRadius: '2px',
                  boxShadow: isAgentSpeaking && pct > 30 ? '0 0 6px rgba(0, 229, 255, 0.6)' : 'none',
                  transition: 'height 0.04s ease'
                }}
              />
            );
          })}
        </div>
      </div>

      {/* BAR 2: USER / INPUT VOICE / PITCH */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#00ff88', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mic size={13} /> 2. Input Voice / Pitch
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              style={{ fontSize: '10px', color: isInputActive ? '#00ff88' : isInputError ? '#ff6666' : 'var(--text-muted)' }}
              title={`Raw RMS: ${inputRawRms.toFixed(4)}, Level: ${inputDb.toFixed(1)} dB`}
            >
              {inputVol}% RMS
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '2px 8px',
              borderRadius: '10px',
              background: isInputError 
                ? 'rgba(255, 68, 68, 0.2)' 
                : isInputActive 
                ? 'rgba(0, 255, 136, 0.2)' 
                : 'rgba(255, 255, 255, 0.05)',
              color: isInputError 
                ? '#ff6666' 
                : isInputActive 
                ? '#00ff88' 
                : 'var(--text-muted)',
              border: isInputError 
                ? '1px solid rgba(255, 68, 68, 0.5)' 
                : isInputActive 
                ? '1px solid rgba(0, 255, 136, 0.5)' 
                : '1px solid var(--glass-border)',
              boxShadow: isInputActive ? '0 0 10px rgba(0, 255, 136, 0.3)' : 'none'
            }}>
              {inputStatusText}
            </span>
          </div>
        </div>

        {/* Spectrum Equalizer Bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '32px', gap: '3px', padding: '4px 6px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {inputBins.map((val, idx) => {
            const pct = Math.max(8, Math.min(100, (val / 255) * 100));
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: `${pct}%`,
                  background: isInputActive
                    ? `linear-gradient(to top, #00ff88 ${Math.min(100, pct)}%, #00e5ff 100%)`
                    : 'rgba(0, 255, 136, 0.12)',
                  borderRadius: '2px',
                  boxShadow: isInputActive && pct > 30 ? '0 0 6px rgba(0, 255, 136, 0.6)' : 'none',
                  transition: 'height 0.04s ease'
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
