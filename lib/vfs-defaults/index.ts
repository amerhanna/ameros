import manifest from './manifest.json';

export interface VFSFile {
  relativePath: string;
  name: string;
  contentBase64: string;
  contentType: string;
}

export interface VFSDefaults {
  folders: string[];
  files: VFSFile[];
}

export { default as manifest } from './manifest.json';

const defaultVfs: VFSDefaults = manifest as VFSDefaults;

export default defaultVfs;
