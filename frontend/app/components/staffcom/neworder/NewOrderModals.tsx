"use client";

import CategoryPickerModal from "./CategoryPickerModal";
import ServiceItemFormModal from "./ServiceItemFormModal";
import SuppliesModal from "./SuppliesModal";
import {
  ServiceCategory,
  ServiceItemOption,
  SupplyItem,
} from "../../../staff/(dashboard)/neworder/types";

interface NewOrderModalsProps {
  showCategoryModal: boolean;
  onCloseCategoryModal: () => void;
  categories: ServiceCategory[];
  onCategorySelect: (category: ServiceCategory) => void;

  selectedCategory: ServiceCategory | null;
  itemOptions: ServiceItemOption[];
  onServiceConfirm: (result: {
    itemName: string;
    quantityKg: number;
    serviceType: string;
    total: number;
  }) => void;
  onServiceCancel: () => void;

  showSuppliesModal: boolean;
  supplies: SupplyItem[];
  onSupplyAdd: (supply: SupplyItem, quantity: number) => void;
  onCloseSuppliesModal: () => void;
}

export default function NewOrderModals({
  showCategoryModal,
  onCloseCategoryModal,
  categories,
  onCategorySelect,
  selectedCategory,
  itemOptions,
  onServiceConfirm,
  onServiceCancel,
  showSuppliesModal,
  supplies,
  onSupplyAdd,
  onCloseSuppliesModal,
}: NewOrderModalsProps) {
  return (
    <>
      {showCategoryModal && (
        <CategoryPickerModal
          categories={categories}
          onSelect={onCategorySelect}
          onClose={onCloseCategoryModal}
        />
      )}

      {selectedCategory && (
        <ServiceItemFormModal
          category={selectedCategory}
          itemOptions={itemOptions}
          onConfirm={onServiceConfirm}
          onCancel={onServiceCancel}
        />
      )}

      {showSuppliesModal && (
        <SuppliesModal
          supplies={supplies}
          onAdd={onSupplyAdd}
          onClose={onCloseSuppliesModal}
        />
      )}
    </>
  );
}