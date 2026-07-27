import type { ShopId } from './shop';

export interface Me {
  userId: string;
  fullName: string;
  role: 'owner' | 'staff';
  shop: {
    id: ShopId;
    name: string;
    currency: string;
  };
}
