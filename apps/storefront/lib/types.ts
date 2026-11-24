export interface StorefrontModifier {
  id: string;
  name: string;
  priceAdjustment: string;
  isDefault: boolean;
}

export interface StorefrontModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  modifiers: StorefrontModifier[];
}

export interface StorefrontItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  isVeg: boolean;
  isVegan: boolean;
  spiceLevel: number | null;
  allergens: string[];
  modifierGroups: { modifierGroup: StorefrontModifierGroup }[];
}

export interface StorefrontCategory {
  id: string;
  name: string;
  items: StorefrontItem[];
}

export interface StorefrontMenu {
  restaurantName: string;
  branchName: string;
  isStoreOpen: boolean;
  logoUrl: string | null;
  currency: string;
  categories: StorefrontCategory[];
}

export interface JournalCard {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string | null;
  publishedAt: string | null;
}
