import NetMirrorParser from './netmirror-parser';
import { createNetflixMirror } from './create-netflixmirror';

class NetflixMirror extends NetMirrorParser {
  constructor(customBaseURL?: string) {
    super(createNetflixMirror, customBaseURL);
  }
}

export default NetflixMirror;
