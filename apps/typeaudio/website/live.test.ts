import { describe,it,expect } from 'vitest';
import { createDevice } from 'typeshade/runtime';
import { DEFAULT } from "./sound/defaultPatch.ts";
import { LiveDsp } from './live-dsp.ts';
import { renderPatch } from './designer-render.ts';

describe('continuous synchronous audio',()=>{
  it('fills each block synchronously and holds the TypeAudio offline signal',async()=>{
    const p={...DEFAULT,voices:1,detune:0,spread:0,filter:true,distortion:false,delay:false,reverb:false,duration:0.5,release:0.1};
    const dsp=new LiveDsp(p);dsp.repeat=true;
    const frames=4096,out=new Float32Array(frames);dsp.process(out);
    expect(dsp.frames).toBe(frames);expect(out.some(x=>Math.abs(x)>0.01)).toBe(true);
    const dev=await createDevice({prefer:['cpu']});
    try{
      const reference=(await renderPatch(dev,p)).samples;
      const difference=out.reduce((max,x,i)=>Math.max(max,Math.abs(x-reference[i]!*p.volume)),0);
      expect(difference).toBeLessThan(0.00001);
    }finally{await dev.dispose();}
  });
  it('keeps its clock and changes the running signal after a patch update',()=>{
    const p={...DEFAULT,shapeA:0,shapeB:0,blend:0,voices:1,filter:false,distortion:false,attack:0.002,decay:0.01,sustain:1,volume:0.4};
    const dsp=new LiveDsp(p);dsp.repeat=false;
    const before=new Float32Array(48000);dsp.process(before);
    dsp.update({...p,frequency:880});const after=new Float32Array(48000);dsp.process(after);
    expect(dsp.frames).toBe(96000);expect(dsp.revision).toBe(1);
    const crossings=(x:Float32Array)=>x.subarray(24000).reduce((n,v,i,a)=>n+(i>0&&a[i-1]!<0&&v>=0?1:0),0);
    expect(crossings(before)).toBeGreaterThan(100);expect(crossings(before)).toBeLessThan(120);
    expect(crossings(after)).toBeGreaterThan(430);expect(crossings(after)).toBeLessThan(450);
  });
  it('preserves effect tails when the oscillator envelope is retriggered',()=>{
    const p={...DEFAULT,delay:true,reverb:true,delayMix:0.5,attack:0.002,decay:0.01,sustain:0,duration:0.5,release:0.02};
    const dsp=new LiveDsp(p);dsp.repeat=false;
    dsp.process(new Float32Array(12000));
    const tail=new Float32Array(6000);dsp.process(tail);
    expect(tail.some(x=>Math.abs(x)>0.00001)).toBe(true);
    const frames=dsp.frames;dsp.retrigger();dsp.process(new Float32Array(128));expect(dsp.frames).toBe(frames+128);
  });
});

describe('optimized block DSP equivalence',()=>{
  it('matches the independent TypeAudio voice for every waveform, filter bypass and a repeated envelope',async()=>{
    const {DesignerVoice}=await import('./designer.shade.ts');
    const {LiveVoice}=await import('./live-voice.ts');
    for(const shape of [0,1,2,3])for(const filtered of [0,1]){
      const args=[220,329.63,shape,3,.11,.35,1800,.8,filtered,.005,.1,.4,.02,.5] as const;
      const reference=new DesignerVoice(...args),voice=new LiveVoice(...args);
      voice.configure(220,329.63,shape,3,.35,1800,.8,filtered,.005,.1,.4,.02,.5,1);
      let largest=0;
      for(let at=0;at<32000;at+=128){const out=voice.block(128);for(let n=0;n<128;n++){
        if(reference.age>=Math.fround(Math.fround(.5+.02)*48000))reference.age=0;
        largest=Math.max(largest,Math.abs(out[n]!-reference.tick()));
      }}
      expect(largest,`shape ${shape}, filter ${filtered}`).toBeLessThan(.00001);
    }
  },20000);
  it('keeps eight-voice modulation and effect state identical across callback boundaries',()=>{
    const patch={...DEFAULT,voices:8,delay:true,reverb:true,lfoDepth:.8,lfoRate:12};
    const a=new LiveDsp(patch),b=new LiveDsp(patch),whole=new Float32Array(16384),split=new Float32Array(16384),block=new Float32Array(128);
    a.process(whole);for(let at=0;at<split.length;at+=128){b.process(block);split.set(block,at);}
    expect(split).toEqual(whole);expect(b.frames).toBe(a.frames);expect(split.every(Number.isFinite)).toBe(true);
  });
});
