import { Container, Sprite, Texture } from 'pixi.js';
import type { Application } from 'pixi.js';

export type AccessResult = 'success' | 'unauthorized' | 'unavailable';

export class AccessScreen {
   readonly container: Container;

   private readonly overlay: HTMLDivElement;
   private readonly input: HTMLInputElement;
   private readonly submit_button: HTMLButtonElement;
   private readonly error_message: HTMLParagraphElement;
   private readonly sync_position: () => void;

   constructor(
      private readonly app: Application,
      width: number,
      height: number,
      on_submit: (code: string) => Promise<AccessResult>,
      initial_result?: Exclude<AccessResult, 'success'>,
   ) {
      this.container = new Container();

      const background_image = width < height
         ? '/assets/background-settings-mobile.png'
         : '/assets/background-settings.png';
      const background = new Sprite(Texture.from(background_image));
      background.width = width;
      background.height = height;
      this.container.addChild(background);
      app.stage.addChild(this.container);

      this.overlay = document.createElement('div');
      this.overlay.className = 'access-overlay';
      this.overlay.innerHTML = `
         <form class="access-card" novalidate>
            <div class="access-copy">
               <strong>Entre ton code d’accès</strong>
               <span>Enter your access code</span>
            </div>
            <input
               class="access-input"
               name="code"
               type="text"
               inputmode="text"
               autocomplete="one-time-code"
               autocapitalize="characters"
               maxlength="6"
               aria-label="Code d’accès / Access code"
               placeholder="ABC234"
               required
            />
            <button class="access-submit" type="submit">Entrer / Sign in</button>
            <p class="access-error" role="alert" aria-live="polite"></p>
         </form>
      `;
      document.body.appendChild(this.overlay);

      this.input = this.overlay.querySelector<HTMLInputElement>('.access-input')!;
      this.submit_button = this.overlay.querySelector<HTMLButtonElement>('.access-submit')!;
      this.error_message = this.overlay.querySelector<HTMLParagraphElement>('.access-error')!;

      this.input.addEventListener('input', () => {
         const selection_start = this.input.selectionStart;
         this.input.value = this.input.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 6);
         if (selection_start !== null) {
            this.input.setSelectionRange(selection_start, selection_start);
         }
         this.show_result(undefined);
      });

      const form = this.overlay.querySelector<HTMLFormElement>('form')!;
      form.addEventListener('submit', async (event) => {
         event.preventDefault();

         const code = this.input.value.trim().toUpperCase();
         if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
            this.show_result('unauthorized');
            this.input.focus();
            return;
         }

         this.set_loading(true);
         const result = await on_submit(code);
         if (result !== 'success') {
            this.set_loading(false);
            this.show_result(result);
            this.input.select();
         }
      });

      this.sync_position = () => {
         const rectangle = this.app.canvas.getBoundingClientRect();
         this.overlay.style.left = `${rectangle.left}px`;
         this.overlay.style.top = `${rectangle.top}px`;
         this.overlay.style.width = `${rectangle.width}px`;
         this.overlay.style.height = `${rectangle.height}px`;
      };
      this.sync_position();
      window.addEventListener('resize', this.sync_position);
      this.show_result(initial_result);
      this.input.focus();
   }

   destroy(): void {
      window.removeEventListener('resize', this.sync_position);
      this.overlay.remove();
      this.container.destroy({ children: true });
   }

   private set_loading(loading: boolean): void {
      this.input.disabled = loading;
      this.submit_button.disabled = loading;
      this.submit_button.textContent = loading ? '…' : 'Entrer / Sign in';
   }

   private show_result(result?: Exclude<AccessResult, 'success'>): void {
      if (result === 'unauthorized') {
         this.error_message.textContent = 'Code incorrect. / Invalid code.';
      } else if (result === 'unavailable') {
         this.error_message.textContent = 'Service indisponible, réessaie. / Service unavailable, please try again.';
      } else {
         this.error_message.textContent = '';
      }
   }
}
