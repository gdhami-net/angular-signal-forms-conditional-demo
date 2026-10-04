# angular-signal-forms-conditional-demo

Companion to the post **"How to validate conditional fields in Angular Signal
Forms"**.

A checkout form with a "ship to a different address" checkbox. Tick it and two
required address fields appear; untick it and they go away. The
[validation guide](https://angular.dev/guide/forms/signals/validation) says
hidden and disabled fields don't run their validators until the field becomes
interactive again, and `@angular/forms`' own type for
[`hidden`](https://angular.dev/guide/forms/signals/form-logic) says a hidden
field "is ignored when determining the valid, touched, and dirty states".

This repository asserts what that means for the data you are about to send.

## What it proves

Angular 22.2.1, `@angular/forms` 22.2.1, TypeScript 6.0.3, Vitest 5.0.3 through
`@angular/build:unit-test`. 13 tests, two files.

`src/app/checkout.ts` holds the model, the schema and the submit helper.
`hidden` is attached to the `shipping` group, so the children inherit it:

```ts
hidden(path.shipping, { when: ({ valueOf }) => !valueOf(path.shipToDifferentAddress) });
required(path.shipping.line1, { message: 'Street is required' });
required(path.shipping.city, { message: 'City is required' });
```

### `src/app/checkout.spec.ts` — the post's claims

| state | `valid()` | `shipping.line1().errors()` | `value().shipping` |
| --- | --- | --- | --- |
| box off, email filled, street empty | `true` | `[]` | `{line1: '', city: ''}` |
| box on, street empty | `false` | one required error | `{line1: '', city: ''}` |
| box on, street and city filled | `true` | `[]` | what the user typed |
| box turned off again | `true` | `[]` | **still what the user typed** |
| box on, street filled, city empty, then box off | `true` | `[]` | `{line1: '12 Old Road', city: ''}` |

The "box turned off again" row is the one that bites. `valid()` is `true`,
`errorSummary()` is empty, and `value().shipping` still holds
`{line1: '12 Old Road', city: 'Doha'}` because nothing cleared it. The model
signal passed to `form()` holds the same thing: Signal Forms writes through to
it rather than keeping its own copy.

The last row is the state the post's animation draws: a half-filled address
section, hidden, with the form calling itself valid.

`submit()` doesn't help. With the box off and the two required fields empty, it
runs its `action` and never calls `onInvalid`, and the action sees
`shipping: {line1: '', city: ''}`.

`payloadFor()` is the fix the post recommends. It reads `hidden()` off the
group and drops the section:

```ts
export function payloadFor(form: FieldTree<Checkout>): CheckoutPayload {
  const { shipping, ...rest } = form().value();
  return form.shipping().hidden() ? rest : { ...rest, shipping };
}
```

### `src/app/alternatives.spec.ts` — three things people try instead

All three are asserted so the post's advice can say "this doesn't fix it" with
something behind it.

`disabled(path.shipping, ...)` instead of `hidden`: the required rule is
skipped the same way, `valid()` is `true` with an empty required field, and
`value().shipping` keeps the stale address. Same outcome. The two differ in
what the user sees and in what a native HTML form submission would carry, not
in what `valid()` reports or what the value holds.

`readonly(path.shipping, ...)` instead of `hidden`: same again, the required
rule on the empty field is skipped and `valid()` is `true`.

`required(path.shipping.line1, {when: ...})` instead of hiding anything, the
conditional validator the validation guide shows: nothing is hidden or
disabled, the rule applies only while the box is ticked, `valid()` is `true`
after the box goes off, and `value().shipping` still keeps the stale address.
Same outcome again. `when` is the right tool when you want the *rule* to be
conditional; it is not a fix for the payload.

### Edge cases the post leaves out

- Where the three logic rules actually differ is the guide's comparison table,
  not validation: a readonly field is the only one of the three that a native
  HTML form submission includes, and a readonly field is the only one the user
  can still focus and select.
- `submit(form, {ignoreValidators: 'all'})` submits whatever the validation
  state is. Not related to this problem, but worth knowing before you reach
  for it as a workaround.
- Clearing the value instead of dropping the key is the other reasonable
  choice. Set `f.shipping().value.set({line1: '', city: ''})` when the box goes
  off, and the API receives an explicit empty address instead of no address.
  Which one is right depends on whether your API treats a missing field and an
  empty field differently.
- Hidden state is not DOM state. `hidden()` applies no attribute of its own, so
  the template still needs `@if (!f.shipping().hidden())` around the fields.
  `src/app/app.ts` does exactly that.

## Running it

```
npm install
npm run check
```

`npm run check` builds the app, runs the suite, and asserts the lines the post
quotes:

```
PASS  ng build (the form, the schema and the submit helper compile)
PASS  ng test exits 0
PASS  ng test reports: Tests  13 passed
PASS  ng test reports: Test Files  2 passed
PASS  @angular/core is 22.x (22.2.1)
PASS  @angular/forms is 22.x (22.2.1)
PASS  @angular/forms exports the ./signals entry point
PASS  @angular/forms types say a hidden field is ignored for the form's valid state

All checks passed.
```

Measured here on Node 26.1.0 and npm 11.13.0, Windows 11. Not tested on Linux.

## Seeing it in a browser

```
npm start
```

Fill the email, tick the box, fill the address, then untick the box. The page
prints the `valid()` badge, the whole form value, and the payload
`payloadFor()` would send, side by side.

## Layout

```
src/app/checkout.ts            the model, the schema, and payloadFor()
src/app/checkout.spec.ts       what valid() reports and what the value holds
src/app/alternatives.spec.ts   disabled, readonly, and a conditional rule
src/app/app.ts                 the form in a browser, with both objects printed
check.mjs                      the assertions the post quotes
```

## Licence

MIT. See [LICENSE](LICENSE).
