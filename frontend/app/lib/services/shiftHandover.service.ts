// Backend-preparation seam: pages import shift-handover data from here, not
// from localShiftHandover.ts directly. Today this just re-exports the
// localStorage implementation unchanged; once a real API exists, only this
// file's internals need to change, not every page that reads/writes shift
// handovers.
export {
  getStoredShiftHandovers,
  submitShiftHandover,
  getLastHandoverTimestamp,
  getCashDrawerStart,
  getUnreportedActivity,
} from "../../staff/(dashboard)/localShiftHandover";
