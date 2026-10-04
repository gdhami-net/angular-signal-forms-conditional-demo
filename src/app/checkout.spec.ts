// The claims the post makes, each one asserted against a real Signal Forms
// instance. Angular 22.2.1, @angular/forms 22.2.1.
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, submit } from '@angular/forms/signals';
import { Checkout, checkoutSchema, emptyCheckout, payloadFor } from './checkout';

function build() {
  const model = signal<Checkout>(emptyCheckout());
  const f = TestBed.runInInjectionContext(() => form(model, checkoutSchema));
  return { model, f };
}

describe('a hidden required field and valid()', () => {
  it('reports the form valid while a required hidden field is empty', () => {
    const { f } = build();
    f.email().value.set('buyer@example.com');

    // The box is untouched, so the whole shipping group is hidden.
    expect(f.shipping().hidden()).toBe(true);
    expect(f.shipping.line1().hidden()).toBe(true);

    // line1 is required and empty, and carries no error at all.
    expect(f.shipping.line1().value()).toBe('');
    expect(f.shipping.line1().errors()).toEqual([]);
    expect(f().errorSummary()).toEqual([]);

    expect(f().valid()).toBe(true);
  });

  it('hides the children when hidden is attached to the group', () => {
    const { f } = build();
    f.shipToDifferentAddress().value.set(true);

    expect(f.shipping().hidden()).toBe(false);
    expect(f.shipping.line1().hidden()).toBe(false);
    expect(f.shipping.line1().errors().length).toBe(1);
    expect(f().valid()).toBe(false);
  });
});

describe('what the form value holds', () => {
  it('keeps what the user typed before the section was hidden', () => {
    const { f, model } = build();
    f.email().value.set('buyer@example.com');
    f.shipToDifferentAddress().value.set(true);
    f.shipping.line1().value.set('12 Old Road');
    f.shipping.city().value.set('Doha');
    expect(f().valid()).toBe(true);

    // The user changes their mind and unticks the box.
    f.shipToDifferentAddress().value.set(false);

    expect(f.shipping().hidden()).toBe(true);
    expect(f().valid()).toBe(true);
    expect(f().value().shipping).toEqual({ line1: '12 Old Road', city: 'Doha' });
    expect(model().shipping).toEqual({ line1: '12 Old Road', city: 'Doha' });
  });

  // The exact state the post's animation draws: one address field filled, the
  // other still empty, then the box goes off.
  it('turns valid with one field filled and the other still empty', () => {
    const { f } = build();
    f.email().value.set('buyer@example.com');
    f.shipToDifferentAddress().value.set(true);
    f.shipping.line1().value.set('12 Old Road');

    expect(f().valid()).toBe(false);
    expect(f.shipping.city().errors().length).toBe(1);

    f.shipToDifferentAddress().value.set(false);

    expect(f().valid()).toBe(true);
    expect(f.shipping.city().errors()).toEqual([]);
    expect(f().value().shipping).toEqual({ line1: '12 Old Road', city: '' });
  });

  it('runs the required rule again once the section is visible', () => {
    const { f } = build();
    f.email().value.set('buyer@example.com');
    expect(f().valid()).toBe(true);

    f.shipToDifferentAddress().value.set(true);

    expect(f().valid()).toBe(false);
    expect(f.shipping.line1().errors().length).toBe(1);
    expect(f.shipping.city().errors().length).toBe(1);
  });
});

describe('submit', () => {
  it('runs the action even though a hidden required field is empty', async () => {
    const { f } = build();
    f.email().value.set('buyer@example.com');

    let seen: Checkout | null = null;
    let wentToOnInvalid = false;
    await submit(f, {
      action: async () => {
        seen = f().value();
        return undefined;
      },
      onInvalid: () => {
        wentToOnInvalid = true;
      },
    });

    expect(wentToOnInvalid).toBe(false);
    expect(seen).not.toBeNull();
    expect(seen!.shipping).toEqual({ line1: '', city: '' });
  });
});

describe('payloadFor', () => {
  it('leaves the hidden section out', () => {
    const { f } = build();
    f.email().value.set('buyer@example.com');
    f.shipToDifferentAddress().value.set(true);
    f.shipping.line1().value.set('12 Old Road');
    f.shipping.city().value.set('Doha');
    f.shipToDifferentAddress().value.set(false);

    expect(payloadFor(f)).toEqual({
      email: 'buyer@example.com',
      shipToDifferentAddress: false,
    });
    expect('shipping' in payloadFor(f)).toBe(false);
  });

  it('includes the section while it is visible', () => {
    const { f } = build();
    f.email().value.set('buyer@example.com');
    f.shipToDifferentAddress().value.set(true);
    f.shipping.line1().value.set('12 Old Road');
    f.shipping.city().value.set('Doha');

    expect(payloadFor(f)).toEqual({
      email: 'buyer@example.com',
      shipToDifferentAddress: true,
      shipping: { line1: '12 Old Road', city: 'Doha' },
    });
  });
});
