import { effectiveMaxQuantity } from './cart-math';
import { emptyCart, type CartAction, type CartLine, type CartState } from './cart-types';

function clampQuantity(quantity: number, line: Pick<CartLine, 'selectedUnit' | 'baseUnit' | 'unitsPerCarton' | 'maxQuantity'>): number {
  const max = Math.max(0, effectiveMaxQuantity(line));
  return Math.min(Math.max(1, Math.trunc(quantity)), max || 1);
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add-product': {
      const { product } = action;
      const existing = state.lines.find((line) => line.productId === product.id);
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((line) =>
            line.productId === product.id
              ? { ...line, quantity: clampQuantity(line.quantity + 1, line) }
              : line,
          ),
        };
      }
      const newLine: CartLine = {
        productId: product.id,
        productName: product.name,
        baseUnit: product.unit,
        unitsPerCarton: product.unitsPerCarton,
        basePrice: product.sellingPrice,
        selectedUnit: product.unit,
        quantity: 1,
        maxQuantity: product.currentStock,
        discount: null,
      };
      return { ...state, lines: [...state.lines, newLine] };
    }

    case 'remove-line':
      return { ...state, lines: state.lines.filter((line) => line.productId !== action.productId) };

    case 'set-quantity':
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.productId === action.productId ? { ...line, quantity: clampQuantity(action.quantity, line) } : line,
        ),
      };

    case 'set-unit':
      return {
        ...state,
        lines: state.lines.map((line) => {
          if (line.productId !== action.productId) return line;
          const updated = { ...line, selectedUnit: action.unit };
          return { ...updated, quantity: clampQuantity(line.quantity, updated) };
        }),
      };

    case 'set-line-discount':
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.productId === action.productId ? { ...line, discount: action.discount } : line,
        ),
      };

    case 'set-sale-discount':
      return { ...state, saleDiscount: action.discount };

    case 'clear':
      return emptyCart;
  }
}
