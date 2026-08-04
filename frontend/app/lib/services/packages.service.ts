// Backend-preparation seam: pages import package (catalog) data from here,
// not from localPackages.ts directly. Today this just re-exports the
// localStorage implementation unchanged; once a real API exists, only this
// file's internals need to change, not every page that reads/writes
// packages.
export {
  getStoredPackages,
  addPackage,
  updatePackage,
  deletePackage,
} from "../localPackages";
