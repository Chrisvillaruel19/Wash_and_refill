import { apiClient } from "../apiClient";
import { ServiceItem } from "../../staff/(dashboard)/neworder/types";

type BackendItemType =
  | "CLOTHES"
  | "HOUSEHOLD_ITEMS"
  | "DRY_CLEAN_7_DAYS"
  | "CARPET"
  | "RUGS_AND_FLEECE_BLANKET";

// Matches the fixed categoryIds in staff/(dashboard)/neworder/data.ts's
// serviceCategories — both sides are a closed, hand-maintained set.
const CATEGORY_TO_ITEM_TYPE: Record<string, BackendItemType> = {
  clothes: "CLOTHES",
  rugs: "RUGS_AND_FLEECE_BLANKET",
  household: "HOUSEHOLD_ITEMS",
  carpet: "CARPET",
  dryclean: "DRY_CLEAN_7_DAYS",
};

const ITEM_TYPE_TO_CATEGORY: Record<BackendItemType, string> = {
  CLOTHES: "clothes",
  RUGS_AND_FLEECE_BLANKET: "rugs",
  HOUSEHOLD_ITEMS: "household",
  CARPET: "carpet",
  DRY_CLEAN_7_DAYS: "dryclean",
};

type BackendLaundryService = {
  id: string;
  serviceName: string;
  itemType: BackendItemType;
  price: string;
};

function mapService(s: BackendLaundryService): ServiceItem {
  return {
    id: s.id,
    categoryId: ITEM_TYPE_TO_CATEGORY[s.itemType],
    name: s.serviceName,
    pricePerKg: Number(s.price),
  };
}

export async function getServices(): Promise<ServiceItem[]> {
  const { services } = await apiClient.get<{ services: BackendLaundryService[] }>(
    "/laundry-services"
  );
  return services.map(mapService);
}

export async function createService(data: {
  categoryId: string;
  name: string;
  pricePerKg: number;
}): Promise<ServiceItem> {
  const { service } = await apiClient.post<{ service: BackendLaundryService }>(
    "/laundry-services",
    {
      serviceName: data.name,
      itemType: CATEGORY_TO_ITEM_TYPE[data.categoryId],
      price: data.pricePerKg,
    }
  );
  return mapService(service);
}

export async function updateService(
  id: string,
  data: { categoryId: string; name: string; pricePerKg: number }
): Promise<ServiceItem> {
  const { service } = await apiClient.patch<{ service: BackendLaundryService }>(
    `/laundry-services/${id}`,
    {
      serviceName: data.name,
      itemType: CATEGORY_TO_ITEM_TYPE[data.categoryId],
      price: data.pricePerKg,
    }
  );
  return mapService(service);
}

export async function deleteService(id: string): Promise<void> {
  await apiClient.delete(`/laundry-services/${id}`);
}
