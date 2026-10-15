import NetMirrorParser from './netmirror-parser';
import { createDisneyMirror } from './create-netflixmirror';

class DisneyMirror extends NetMirrorParser {
  constructor(customBaseURL?: string) {
    super(createDisneyMirror, customBaseURL);
  }
}

export default DisneyMirror;
