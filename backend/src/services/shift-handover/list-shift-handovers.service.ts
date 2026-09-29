import { ShiftHandoverRepository } from "../../repositories/shift-handover.repository.js";
import { DrawerStateRepository } from "../../repositories/drawer-state.repository.js";

const shiftHandoverRepository = new ShiftHandoverRepository();
const drawerStateRepository = new DrawerStateRepository();

// Shared visibility (approved): every authenticated user sees every
// handover — one physical drawer, not private per-user data.
export async function listShiftHandoversService(params: { page: number; pageSize: number }) {
  try {
    const [records, total, drawerState] = await Promise.all([
      shiftHandoverRepository.findAll(params),
      shiftHandoverRepository.count(),
      drawerStateRepository.get(),
    ]);

    const shiftHandovers = records.map(({ user, inventorySnapshot, ...record }) => ({
      ...record,
      staffName: user.name,
      inventorySnapshot: inventorySnapshot.map(({ inventoryId, itemName, unit, beginningQty, endingQty }) => ({
        inventoryId,
        itemName,
        unit,
        beginningQty,
        endingQty,
      })),
    }));

    return {
      code: 200,
      status: "success",
      message: "Shift handover records retrieved successfully",
      data: {
        shiftHandovers,
        // Backend-authoritative effective starting cash for "no previous
        // handover" (see getDrawerStart) — included on every page so the
        // Staff Shift Handover page (which only ever needs page 1) and the
        // Admin drawer-settings UI can both read the current value from
        // this already-existing endpoint instead of a new one.
        defaultStartingCash: drawerState.defaultStartingCash,
        pagination: {
          page: params.page,
          pageSize: params.pageSize,
          total,
          totalPages: Math.ceil(total / params.pageSize) || 1,
        },
      },
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
