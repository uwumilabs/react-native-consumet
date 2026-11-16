import { unpackScripts } from '../../src/extractors/packer';

/** A script packed with Dean Edwards' packer: `payload` with its words numbered in base 36. */
const packed = (payload: string, words: string[]) =>
  `<script>eval(function(p,a,c,k,e,d){e=function(c){return c.toString(36)};if(!''.replace(/^/,String)){while(c--){d[c.toString(a)]=k[c]||c.toString(a)}k=[function(e){return d[e]}];e=function(){return'\\\\w+'};c=1};while(c--){if(k[c]){p=p.replace(new RegExp('\\\\b'+e(c)+'\\\\b','g'),k[c])}}return p}('${payload}',36,${words.length},'${words.join('|')}'.split('|'),0,{}))</script>`;

describe('unpackScripts', () => {
  it('replaces each word once, as the packer does, even when a word is itself a key', () => {
    // Word 1 is "0", the key of word 0: decoding again would turn it into "a".
    expect(unpackScripts(packed('var x=1;var y=0', ['a', '0']))).toEqual(['var x=0;var y=a']);
  });

  it("undoes the payload's and the words' string escapes", () => {
    expect(unpackScripts(packed("0(\\'1\\')", ['play', "it\\'s"]))).toEqual(["play('it's')"]);
  });
});
