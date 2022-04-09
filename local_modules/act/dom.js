const updateDomStyle = ({ dom, style }) => {
  for (const [key, value] of Object.entries(style)) {
    dom.style[key] = value;
  }
};

const updateDomAttrs = ({ dom, attrs }) => {
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "style") {
      updateDomStyle({ dom, style: value });
    } else {
      dom.setAttribute(key, value);
    }
  }
};

const updateDom = ({ dom, attrs, children }) => {
  if (attrs) updateDomAttrs({ dom, attrs });
  if (children) dom.replaceChildren(...children);
};

const createDom = ({ tagName, attrs, children }) => {
  const dom = document.createElement(tagName);
  updateDom({ dom, attrs, children });
  return dom;
};

export { createDom };
