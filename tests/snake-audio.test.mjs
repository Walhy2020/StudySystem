import test from "node:test";
import assert from "node:assert/strict";
import { Soundscape } from "../src/snake-audio.js";

test("Snake raises music/effect outputs and restores them after webpage mute", async () => {
  class Parameter { value=0; setValueAtTime() {} exponentialRampToValueAtTime() {} }
  class Node { gain=new Parameter(); frequency=new Parameter(); connect(){} disconnect(){} start(){} stop(){} }
  class Context {
    state="suspended";currentTime=0;destination=new Node();
    createGain(){return new Node();}createOscillator(){return new Node();}
    async resume(){this.state="running";}async close(){this.state="closed";}
  }
  const sound=new Soundscape(null,Context);
  try {
    for(let i=0;i<2;i++){
      assert.equal(await sound.setEnabled(true),true);
      assert.equal(sound.master.gain.value,1);
      assert.equal(sound.music.gain.value,.9);
      assert.equal(sound.effects.gain.value,1.6);
      sound.play("glyph");sound.play("damage");
      await sound.setEnabled(false);assert.equal(sound.context,null);assert.equal(sound.timer,null);
    }
  }finally{await sound.setEnabled(false);}
});
