import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { Checkout, checkoutSchema, emptyCheckout, payloadFor } from './checkout';

/**
 * The form the post talks about. Tick "ship to a different address" and two
 * required fields appear; untick it and they go away again.
 */
@Component({
  selector: 'app-root',
  imports: [FormField, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    form { display: grid; gap: 0.75rem; max-width: 24rem; }
    label { display: grid; gap: 0.25rem; }
    .row { display: flex; gap: 0.5rem; align-items: center; }
    .badge { font-weight: 600; }
    .ok { color: green; }
    .bad { color: crimson; }
    pre { background: rgba(127, 127, 127, 0.15); padding: 0.75rem; }
  `,
  template: `
    <h1>Checkout</h1>
    <form (submit)="send($event)">
      <label>
        Email
        <input type="email" [formField]="checkout.email" />
      </label>

      <div class="row">
        <input id="ship" type="checkbox" [formField]="checkout.shipToDifferentAddress" />
        <label for="ship">Ship to a different address</label>
      </div>

      @if (!checkout.shipping().hidden()) {
        <label>
          Street
          <input [formField]="checkout.shipping.line1" />
        </label>
        <label>
          City
          <input [formField]="checkout.shipping.city" />
        </label>
      }

      <p class="badge" [class.ok]="checkout().valid()" [class.bad]="!checkout().valid()">
        valid(): {{ checkout().valid() }}
      </p>

      <button type="submit">Submit</button>
    </form>

    <h2>What the form holds</h2>
    <pre>{{ checkout().value() | json }}</pre>

    <h2>What would be sent</h2>
    <pre>{{ payload() | json }}</pre>
  `,
})
export class App {
  protected readonly model = signal<Checkout>(emptyCheckout());
  protected readonly checkout = form(this.model, checkoutSchema);
  protected readonly sent = signal<unknown>(null);

  protected payload() {
    return payloadFor(this.checkout);
  }

  protected async send(event: Event) {
    event.preventDefault();
    await submit(this.checkout, async () => {
      this.sent.set(payloadFor(this.checkout));
      return undefined;
    });
  }
}
