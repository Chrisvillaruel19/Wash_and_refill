import { PackageRepository } from "../../repositories/package.repository.js";

const packageRepository = new PackageRepository();

export async function getPackageService(id: string) {
  try {
    const pkg = await packageRepository.findById(id);

    if (!pkg) {
      return {
        code: 404,
        status: "error",
        message: "Package not found",
      };
    }

    return {
      code: 200,
      status: "success",
      message: "Package retrieved successfully",
      data: { package: pkg },
    };
  } catch (error) {
    console.error("getPackageService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve package",
    };
  }
}
