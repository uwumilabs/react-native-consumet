import NetMirrorParser from './netmirror-parser';
import { createPrimeMirror } from './create-netflixmirror';

class PrimeMirror extends NetMirrorParser {
  constructor(customBaseURL?: string) {
    super(createPrimeMirror, customBaseURL);
  }
}

export default PrimeMirror;
