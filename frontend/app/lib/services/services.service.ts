// Backend-preparation seam: pages import service-catalog (Wash & Dry, etc.)
// data from here, not from localServices.ts directly. Today this just
// re-exports the localStorage implementation unchanged; once a real API
// exists, only this file's internals need to change, not every page that
// reads/writes services.
export {
  getStoredServices,
  addService,
  updateService,
  deleteService,
} from "../localServices";
