/**
 * Type aliases.
 */
type Some<T> = T | Array<T>;
type Component = (props: Props) => Some<Renderable>;
type Props = { children?: Array<Renderable> };
type Renderable = string | JsxElement;
type JsxElement = { tag: Tag; props: Props };
type Tag = string | Component;

/**
 * A JSX element expression is just a call to this function.
 */
function createJsxElement(tag: Tag, props: Props, ...children: Array<Renderable>): JsxElement {
  props = { ...props, children };
  return { tag, props };
}

/**
 * A JSX fragment expression is just a normal component.
 */
function JsxFragment(props: Props): Some<Renderable> {
  return props.children;
}

/**
 * Update DOM style.
 */
function updateDomStyle(dom: any, style: any): void {
  for (const [key, value] of Object.entries(style)) {
    dom.style[key] = value;
  }
}

/**
 * Update DOM attributes.
 */
function updateDomAttrs(dom: any, attrs: any): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "style") {
      updateDomStyle(dom, value);
    } else if (key.slice(0, 2) === "on") {
      const eventType = key.slice(2).toLowerCase();
      const listener = value;
      dom.addEventListener(eventType, listener);
    } else {
      dom.setAttribute(key, value);
    }
  }
}

/**
 * Update DOM
 */
function updateDom(dom: any, props: any): void {
  const { children, ...attrs } = props;
  if (attrs) updateDomAttrs(dom, attrs);
  if (children) dom.replaceChildren(...children);
}

/**
 * Create DOM
 */
function createDom(tag: string, props: any) {
  const dom = document.createElement(tag);
  updateDom(dom, props);
  return dom;
}

/**
 * Given a component, render it to return a virtual DOM.
 */
function render(renderable: Some<Renderable>) {
  if (typeof renderable === "string") return renderable;
  if (Array.isArray(renderable)) return renderable.map(render).flat();
  const { tag, props } = renderable;
  if (typeof tag === "function") return render(tag(props));
  return createDom(tag, { ...props, children: render(props.children) });
}

/**
 * A global app object
 */
const app = {
  mounted: false,
  renderable: null,
  container: null,
  state: {},
};

/**
 * The main API of the library, usually used to mount a root component in a DOM.
 */
function mount(renderable: Some<Renderable>, container: any): void {
  app.renderable = renderable;
  app.container = container;
  renderDom();
  app.mounted = true;
}

/**
 * Render the mounted renderable in the DOM container.
 */
function renderDom(): void {
  const someDom = render(app.renderable);
  const doms = Array.isArray(someDom) ? someDom : [someDom];
  app.container.replaceChildren(...doms);
}

/**
 * Get the state of the app.
 */
function getState(initialState: any) {
  return app.mounted ? app.state : initialState;
}

/**
 * Set the state of the app.
 */
function _setState(newState: any) {
  app.state = { ...app.state, ...newState };
}

/**
 * Initialize the state of the app.
 */
function initState(initialState: any) {
  if (!app.mounted) _setState(initialState);
}

/**
 * Set the state of the app and re-render.
 */
function setState(newState: any) {
  _setState(newState);
  renderDom();
}

/**
 * The useState API. It's a hook that returns a pair of state and setState.
 * Because it may be called when the app is not completely mounted, we need
 * to use some tricks to make sure the state is initialized properly.
 */
function useState(initialState: any) {
  initState(initialState);
  return [getState(initialState), setState];
}

export { createJsxElement, JsxFragment, useState, mount };
