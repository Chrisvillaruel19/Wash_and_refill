import { PackageRepository } from "../../repositories/package.repository.js";

const packageRepository = new PackageRepository();

export async function listPackagesService() {
  try {
    const packages = await packageRepository.findAllActive();

    return {
      code: 200,
      status: "success",
      message: "Packages retrieved successfully",
      data: { packages },
    };
  } catch (error) {
    console.error("listPackagesService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve packages",
    };
  }
}
