var d=Object.defineProperty;var p=(n,e,s)=>e in n?d(n,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):n[e]=s;var i=(n,e,s)=>p(n,typeof e!="symbol"?e+"":e,s);import{C as v,S as y,T as m}from"./index-mlQl9Faw.js";class f{constructor(e,s,r,l,u){i(this,"container");i(this,"overlay");i(this,"input");i(this,"submit_button");i(this,"error_message");i(this,"sync_position");this.app=e,this.container=new v;const h=s<r?"/assets/background-settings-mobile.png":"/assets/background-settings.png",o=new y(m.from(h));o.width=s,o.height=r,this.container.addChild(o),e.stage.addChild(this.container),this.overlay=document.createElement("div"),this.overlay.className="access-overlay",this.overlay.innerHTML=`
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
      `,document.body.appendChild(this.overlay),this.input=this.overlay.querySelector(".access-input"),this.submit_button=this.overlay.querySelector(".access-submit"),this.error_message=this.overlay.querySelector(".access-error"),this.input.addEventListener("input",()=>{const t=this.input.selectionStart;this.input.value=this.input.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,"").slice(0,6),t!==null&&this.input.setSelectionRange(t,t),this.show_result(void 0)}),this.overlay.querySelector("form").addEventListener("submit",async t=>{t.preventDefault();const a=this.input.value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(a)){this.show_result("unauthorized"),this.input.focus();return}this.set_loading(!0);const c=await l(a);c!=="success"&&(this.set_loading(!1),this.show_result(c),this.input.select())}),this.sync_position=()=>{const t=this.app.canvas.getBoundingClientRect();this.overlay.style.left=`${t.left}px`,this.overlay.style.top=`${t.top}px`,this.overlay.style.width=`${t.width}px`,this.overlay.style.height=`${t.height}px`},this.sync_position(),window.addEventListener("resize",this.sync_position),this.show_result(u),this.input.focus()}destroy(){window.removeEventListener("resize",this.sync_position),this.overlay.remove(),this.container.destroy({children:!0})}set_loading(e){this.input.disabled=e,this.submit_button.disabled=e,this.submit_button.textContent=e?"…":"Entrer / Sign in"}show_result(e){e==="unauthorized"?this.error_message.textContent="Code incorrect / Invalid code":e==="unavailable"?this.error_message.textContent="Service indisponible, réessaie / Service unavailable, please try again":this.error_message.textContent=""}}export{f as AccessScreen};
