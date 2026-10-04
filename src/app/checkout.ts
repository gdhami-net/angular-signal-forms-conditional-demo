import { schema, hidden, required, email } from '@angular/forms/signals';
import type { FieldTree } from '@angular/forms/signals';

/** The model behind the checkout form. */
export interface Checkout {
  email: string;
  shipToDifferentAddress: boolean;
  shipping: ShippingAddress;
}

export interface ShippingAddress {
  line1: string;
  city: string;
}

export function emptyCheckout(): Checkout {
  return {
    email: '',
    shipToDifferentAddress: false,
    shipping: { line1: '', city: '' },
  };
}

/**
 * The shape the post describes: a checkbox reveals a shipping address, and the
 * address fields are `required`. `hidden` is attached to the group, so the
 * whole section drops out of the form's valid/touched/dirty state when the box
 * is unticked.
 */
export const checkoutSchema = schema<Checkout>((path) => {
  required(path.email, { message: 'Email is required' });
  email(path.email, { message: 'Email looks wrong' });

  hidden(path.shipping, ({ valueOf }) => !valueOf(path.shipToDifferentAddress));

  required(path.shipping.line1, { message: 'Street is required' });
  required(path.shipping.city, { message: 'City is required' });
});

/** What the form holds minus the sections that are hidden right now. */
export type CheckoutPayload = Omit<Checkout, 'shipping'> & {
  shipping?: ShippingAddress;
};

/**
 * Builds the object to send. A hidden section is left out instead of being
 * sent with whatever the user typed before it was hidden.
 */
export function payloadFor(form: FieldTree<Checkout>): CheckoutPayload {
  const { shipping, ...rest } = form().value();
  return form.shipping().hidden() ? rest : { ...rest, shipping };
}
