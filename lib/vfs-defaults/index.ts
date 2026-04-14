import manifest from './manifest.json';

export interface DefaultVfsFile {
  relativePath: string;
  name: string;
  contentBase64: string;
  contentType: string;
}

export interface DefaultVfsManifest {
  files: DefaultVfsFile[];
  folders: string[];
  mounts: { letter: string; handle: null; label?: string }[];
}

const defaultVfs: DefaultVfsManifest = manifest as DefaultVfsManifest;

export default defaultVfs;
