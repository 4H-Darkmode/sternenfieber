/** Dev-only panel: trigger every sound + music mode, tweak volumes. */
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { SFX_NAMES, getMusicMode, initAudio, playSfx, setMusicMode, useAudioSettings } from './index';
import type { MusicMode } from './index';

const box: CSSProperties = {
  font: '12px/1.4 system-ui, sans-serif',
  color: '#e8e8f0',
  background: 'rgba(12,12,24,0.92)',
  border: '1px solid #444',
  borderRadius: 8,
  padding: 10,
  maxWidth: 520,
};
const btn: CSSProperties = {
  font: 'inherit',
  color: 'inherit',
  background: '#2a2a44',
  border: '1px solid #555',
  borderRadius: 4,
  padding: '3px 7px',
  margin: 2,
  cursor: 'pointer',
};

export function AudioTestPanel() {
  const a = useAudioSettings();
  const [mode, setMode] = useState<MusicMode>(getMusicMode());

  const music = (m: MusicMode) => {
    initAudio();
    setMusicMode(m);
    setMode(m);
  };

  return (
    <div style={box}>
      <strong>Audio test</strong>
      <div style={{ margin: '6px 0' }}>
        <label style={{ marginRight: 10 }}>
          <input type="checkbox" checked={a.muted} onChange={(e) => a.setMuted(e.target.checked)} /> mute
        </label>
        <label style={{ marginRight: 10 }}>
          sfx{' '}
          <input type="range" min={0} max={1} step={0.01} value={a.sfxVolume} onChange={(e) => a.setSfxVolume(Number(e.target.value))} />
        </label>
        <label>
          music{' '}
          <input type="range" min={0} max={1} step={0.01} value={a.musicVolume} onChange={(e) => a.setMusicVolume(Number(e.target.value))} />
        </label>
      </div>
      <div style={{ margin: '6px 0' }}>
        music:{' '}
        {(['off', 'base', 'free'] as const).map((m) => (
          <button key={m} type="button" style={{ ...btn, background: mode === m ? '#5a4aa0' : btn.background }} onClick={() => music(m)}>
            {m}
          </button>
        ))}
      </div>
      <div>
        {SFX_NAMES.map((n) => (
          <button key={n} type="button" style={btn} onClick={() => playSfx(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AudioTestPanel;
