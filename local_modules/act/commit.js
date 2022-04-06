import { updateElement } from "./dom";
import { isFunction, LANE } from "./utils";

const commit = (fiber) => {
  let e = fiber.e;
  fiber.e = null;
  do {
    insert(e);
  } while ((e = e.e));
};

const insert = (fiber) => {
  if (fiber.lane === LANE.REMOVE) {
    remove(fiber);
    return;
  }
  if (fiber.lane & LANE.UPDATE) {
    updateElement(fiber.node, fiber.oldProps || {}, fiber.props);
  }
  if (fiber.lane & LANE.INSERT) {
    fiber.parentNode.insertBefore(fiber.node, fiber.after);
  }
  refer(fiber.ref, fiber.node);
};

const refer = (ref, dom) => {
  if (ref) isFunction(ref) ? ref(dom) : (ref.current = dom);
};

const kidsRefer = (kids) => {
  kids.forEach((kid) => {
    kid.kids && kidsRefer(kid.kids);
    refer(kid.ref, null);
  });
};

const remove = (d) => {
  if (d.isComp) {
    d.hooks && d.hooks.list.forEach((e) => e[2] && e[2]());
    d.kids.forEach(remove);
  } else {
    kidsRefer(d.kids);
    d.parentNode.removeChild(d.node);
    refer(d.ref, null);
  }
};

export { commit };