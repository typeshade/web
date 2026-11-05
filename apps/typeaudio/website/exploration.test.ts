import { describe, it, expect } from 'vitest';
import { DEFAULT, validatePatch, PRESETS } from './designer.ts';
import { morphPatch, tonePosition } from './exploration.ts';
import { LiveDsp } from './live-dsp.ts';

describe('sound exploration', () => {
  it('keeps old patches usable while rejecting invalid modulation settings', () => {
    const old = { ...DEFAULT } as Record<string, unknown>;
    for (const key of ['lfoRate','lfoDepth','lfoTarget','lfoShape','lfoSync','tempo']) delete old[key];
    expect(validatePatch(old)).toEqual(DEFAULT);
    for (const changed of [{lfoRate:NaN},{lfoDepth:2},{lfoTarget:0.5},{tempo:0},{lfoSync:1}])
      expect(() => validatePatch({...DEFAULT,...changed})).toThrow();
  });
  it('keeps every interpolated preset pair valid and preserves endpoints', () => {
    for (const a of Object.values(PRESETS)) for (const b of Object.values(PRESETS)) {
      expect(morphPatch(a.patch,b.patch,0)).toEqual(a.patch);
      expect(morphPatch(a.patch,b.patch,1)).toEqual(b.patch);
      for(let i=1;i<100;i++) expect(() => validatePatch(morphPatch(a.patch,b.patch,i/100))).not.toThrow();
    }
    expect(morphPatch({...DEFAULT,cutoff:100},{...DEFAULT,cutoff:10000},0.5).cutoff).toBe(1000);
    expect(tonePosition(-1,2)).toEqual({cutoff:80,blend:0});
    expect(tonePosition(2,-1)).toEqual({cutoff:16000,blend:1});
  });
  it('modulates actual audio without any UI updates and matches beat sync to its free rate', () => {
    const p={...DEFAULT,voices:1,attack:0.002,sustain:1,distortion:false,cutoff:900,lfoDepth:0.7,lfoRate:2};
    const run=(patch:typeof p)=>{const dsp=new LiveDsp(patch);dsp.repeat=false;const pcm=new Float32Array(48000);dsp.process(pcm);return pcm;};
    const modulated=run(p), plain=run({...p,lfoDepth:0});
    const rmsDifference=Math.sqrt(modulated.reduce((sum,x,i)=>sum+(x-plain[i]!)**2,0)/modulated.length);
    expect(rmsDifference).toBeGreaterThan(0.01);
    expect(run({...p,lfoSync:true,tempo:120})).toEqual(modulated);
    for (const lfoTarget of [0,1,2]) for (const lfoShape of [0,1]) {
      const pcm=run({...p,lfoTarget,lfoShape,lfoDepth:1,lfoRate:12});
      expect(pcm.every(Number.isFinite)).toBe(true);
      expect(pcm.some(x=>Math.abs(x)>0.01)).toBe(true);
    }
  });
});
