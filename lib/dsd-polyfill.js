/* eslint-disable */
if (!HTMLTemplateElement.prototype.hasOwnProperty('shadowRoot')) {
  const e =
    document?.currentScript?.previousElementSibling?.querySelector('template');
  const t = e?.parentElement?.attachShadow({ mode: 'open' });
  e?.content && t?.appendChild(e?.content);
}
