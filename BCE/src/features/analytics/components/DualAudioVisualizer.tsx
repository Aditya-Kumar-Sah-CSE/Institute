'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSmartAgentSession } from '../context/SmartAgentSessionContext';
import { Volume2, Mic, Activity } from 'lucide-react';

const NUM_BINS = 16;

export default function DualAudioVisualizer() {
  const {
    realtimeVoiceState,
    getInputAnalyserNode,
    getOutputAnalyserNode
  } = useSmartAgentSession();

  const [agentBins, setAgentBins] = useState<number[]>(() => new Array(NUM_BINS).fill(0));
  const [inputBins, setInputBins] = useState<number[]>(() => new Array(NUM_BINS).fill(0));
  const [agentVol, setAgentVol] = useState<number>(0);
  const [inputVol, setInputVol] = useState<number>(0);

  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (realtimeVoiceState === 'STOPPED') {
      setAgentBins(new Array(NUM_BINS).fill(0));
      setInputBins(new Array(NUM_BINS).fill(0));
      setAgentVol(0);
      setInputVol(0);
      return;
    }

    const agentFreqBuffer = new Uint8Array(NUM_BINS);
    const inputFreqBuffer = new Uint8Array(NUM_BINS);

    const updateAudioMeters = () => {
      const outputAnalyser = getOutputAnalyserNode();
      const inputAnalyser = getInputAnalyserNode();

      // 1. Process Agent Output Audio (Playback stream)
      if (outputAnalyser) {
        outputAnalyser.getByteFrequencyData(agentFreqBuffer);
        const sampledAgent = Array.from(agentFreqBuffer);
        const sumAgent = sampledAgent.reduce((a, b) => a + b, 0);
        const avgAgentVol = Math.round((sumAgent / (NUM_BINS * 255)) * 100);
        setAgentBins(sampledAgent);
        setAgentVol(avgAgentVol);
      } else {
        setAgentBins(new Array(NUM_BINS).fill(0));
        setAgentVol(0);
      }

      // 2. Process User Input Audio (Microphone stream)
      if (inputAnalyser) {
        inputAnalyser.getByteFrequencyData(inputFreqBuffer);
        const sampledInput = Array.from(inputFreqBuffer);
        const sumInput = sampledInput.reduce((a, b) => a + b, 0);
        const avgInputVol = Math.round((sumInput / (NUM_BINS * 255)) * 100);
        setInputBins(sampledInput);
        setInputVol(avgInputVol);
      } else {
        setInputBins(new Array(NUM_BINS).fill(0));
        setInputVol(0);
      }

      animFrameRef.current = requestAnimationFrame(updateAudioMeters);
    };

    animFrameRef.current = requestAnimationFrame(updateAudioMeters);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [realtimeVoiceState, getInputAnalyserNode, getOutputAnalyserNode]);

  if (realtimeVoiceState === 'STOPPED') return null;

  const isAgentSpeaking = agentVol > 3 || realtimeVoiceState === 'SPEAKING_AI';
  const isUserInputActive = inputVol > 3 || realtimeVoiceState === 'HEARING';

  return (
    <div
      style={{
        background: 'rgba(10, 15, 30, 0.85)',
        border: '1px solid rgba(0, 229, 255, 0.25)',
        borderRadius: '12px',
        padding: '12px 14px',
        margin: '10px 0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        backdropFilter: 'none', // Do NOT blur backdrop
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
            <span style={{ fontSize: '10px', color: isAgentSpeaking ? '#00e5ff' : 'var(--text-muted)' }}>
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
              {isAgentSpeaking ? '● SPEAKING' : '○ SILENT'}
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
            <span style={{ fontSize: '10px', color: isUserInputActive ? '#00ff88' : 'var(--text-muted)' }}>
              {inputVol}% RMS
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '2px 8px',
              borderRadius: '10px',
              background: isUserInputActive ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: isUserInputActive ? '#00ff88' : 'var(--text-muted)',
              border: isUserInputActive ? '1px solid rgba(0, 255, 136, 0.5)' : '1px solid var(--glass-border)',
              boxShadow: isUserInputActive ? '0 0 10px rgba(0, 255, 136, 0.3)' : 'none'
            }}>
              {isUserInputActive ? '● LISTENING' : '○ SILENT'}
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
                  background: isUserInputActive
                    ? `linear-gradient(to top, #00ff88 ${Math.min(100, pct)}%, #00e5ff 100%)`
                    : 'rgba(0, 255, 136, 0.12)',
                  borderRadius: '2px',
                  boxShadow: isUserInputActive && pct > 30 ? '0 0 6px rgba(0, 255, 136, 0.6)' : 'none',
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
