import { ShiftHandoverRepository } from "../../repositories/shift-handover.repository.js";

const shiftHandoverRepository = new ShiftHandoverRepository();

// Shared visibility (approved): every authenticated user sees every
// handover — one physical drawer, not private per-user data.
export async function listShiftHandoversService() {
  try {
    const records = await shiftHandoverRepository.findAll();

    const shiftHandovers = records.map(({ user, ...record }) => ({
      ...record,
      staffName: user.name,
    }));

    return {
      code: 200,
      status: "success",
      message: "Shift handover records retrieved successfully",
      data: { shiftHandovers },
    };
  } catch (error) {
    console.error("listShiftHandoversService error", error);
    return {
      code: 500,
      status: "error",
      message: "Unable to retrieve shift handover records",
    };
  }
}
