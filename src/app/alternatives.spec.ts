// Two ways of modelling "not applicable right now" that people reach for
// instead of `hidden`. Both land in the same place, which is why the post
// says the fix belongs at submit and not in the schema.
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { disabled, form, readonly, required, schema } from '@angular/forms/signals';
import { Checkout, emptyCheckout } from './checkout';

const disabledSchema = schema<Checkout>((path) => {
  required(path.email);
  disabled(path.shipping, ({ valueOf }) => !valueOf(path.shipToDifferentAddress));
  required(path.shipping.line1);
  required(path.shipping.city);
});

// The conditional validator the validation guide shows: the rule itself only
// applies while the box is ticked, and nothing is hidden or disabled.
const whenSchema = schema<Checkout>((path) => {
  required(path.email);
  required(path.shipping.line1, {
    when: ({ valueOf }) => valueOf(path.shipToDifferentAddress),
  });
  required(path.shipping.city, {
    when: ({ valueOf }) => valueOf(path.shipToDifferentAddress),
  });
});

function fillThenHide(schemaToUse: typeof disabledSchema) {
  const model = signal<Checkout>(emptyCheckout());
  const f = TestBed.runInInjectionContext(() => form(model, schemaToUse));
  f.email().value.set('buyer@example.com');
  f.shipToDifferentAddress().value.set(true);
  f.shipping.line1().value.set('12 Old Road');
  f.shipping.city().value.set('Doha');
  f.shipToDifferentAddress().value.set(false);
  return f;
}

describe('disabled instead of hidden', () => {
  it('also skips the required rule and also keeps the value', () => {
    const f = fillThenHide(disabledSchema);

    expect(f.shipping().disabled()).toBe(true);
    expect(f.shipping.line1().disabled()).toBe(true);
    expect(f().valid()).toBe(true);
    expect(f().value().shipping).toEqual({ line1: '12 Old Road', city: 'Doha' });
  });

  it('skips the required rule on an empty disabled field too', () => {
    const model = signal<Checkout>(emptyCheckout());
    const f = TestBed.runInInjectionContext(() => form(model, disabledSchema));
    f.email().value.set('buyer@example.com');

    expect(f.shipping.line1().value()).toBe('');
    expect(f.shipping.line1().errors()).toEqual([]);
    expect(f().valid()).toBe(true);
  });
});

describe('readonly instead of hidden', () => {
  it('also skips the required rule', () => {
    const readonlySchema = schema<Checkout>((path) => {
      required(path.email);
      readonly(path.shipping, ({ valueOf }) => !valueOf(path.shipToDifferentAddress));
      required(path.shipping.line1);
      required(path.shipping.city);
    });
    const model = signal<Checkout>(emptyCheckout());
    const f = TestBed.runInInjectionContext(() => form(model, readonlySchema));
    f.email().value.set('buyer@example.com');

    expect(f.shipping.line1().readonly()).toBe(true);
    expect(f.shipping.line1().value()).toBe('');
    expect(f.shipping.line1().errors()).toEqual([]);
    expect(f().valid()).toBe(true);
  });
});

describe('a conditional required rule instead of hidden', () => {
  it('keeps the value just the same', () => {
    const f = fillThenHide(whenSchema);

    expect(f.shipping().hidden()).toBe(false);
    expect(f.shipping().disabled()).toBe(false);
    expect(f().valid()).toBe(true);
    expect(f().value().shipping).toEqual({ line1: '12 Old Road', city: 'Doha' });
  });

  it('applies the rule again when the box goes back on', () => {
    const f = fillThenHide(whenSchema);
    f.shipping.line1().value.set('');
    f.shipToDifferentAddress().value.set(true);

    expect(f().valid()).toBe(false);
    expect(f.shipping.line1().errors().length).toBe(1);
  });
});
