import { LANE, asArray, isFunction, isStringLike } from "./utils";
import { createElement } from "./dom";
import { resetCursor } from "./cursor";
import { schedule, shouldYield } from "./schedule";
import { createText } from "./h";
import { commit } from "./commit";

let currentFiber;
let finish = null;
let effect = null;

const render = (vnode, node) => {
  const rootFiber = {
    node,
    props: { children: vnode },
  };
  update(rootFiber);
};

const update = (fiber) => {
  if (fiber && !(fiber.lane & LANE.DIRTY)) {
    fiber.lane = LANE.UPDATE | LANE.DIRTY;
    schedule(() => {
      effect = fiber;
      return reconcile(fiber);
    });
  }
};

const reconcile = (WIP) => {
  while (WIP && !shouldYield()) WIP = capture(WIP);
  if (WIP) return reconcile.bind(null, WIP);
  if (finish) {
    commit(finish);
    finish = null;
  }
  return null;
};

const capture = (WIP) => {
  WIP.isComp = isFunction(WIP.type);
  WIP.isComp ? updateHook(WIP) : updateHost(WIP);
  if (WIP.child) return WIP.child;
  while (WIP) {
    bubble(WIP);
    if (!finish && WIP.lane & LANE.DIRTY) {
      finish = WIP;
      WIP.lane &= ~LANE.DIRTY;
      return null;
    }
    if (WIP.sibling) return WIP.sibling;
    WIP = WIP.parent;
  }
};

const bubble = (WIP) => {
  if (WIP.isComp) {
    if (WIP.hooks) {
      side(WIP.hooks.layout);
      schedule(() => side(WIP.hooks.effect));
    }
  } else {
    effect.e = WIP;
    effect = WIP;
  }
};

const updateHook = (WIP) => {
  resetCursor();
  currentFiber = WIP;
  let children = WIP.type(WIP.props);
  diffKids(WIP, simpleVnode(children));
};

const updateHost = (WIP) => {
  WIP.parentNode = getParentNode(WIP) || {};
  if (!WIP.node) {
    if (WIP.type === "svg") WIP.lane |= LANE.SVG;
    WIP.node = createElement(WIP);
  }
  WIP.childNodes = Array.from(WIP.node.childNodes || []);
  diffKids(WIP, WIP.props.children);
};

const simpleVnode = (type) => (isStringLike(type) ? createText(type) : type);

const getParentNode = (WIP) => {
  while ((WIP = WIP.parent)) {
    if (!WIP.isComp) return WIP.node;
  }
};

const diffKids = (WIP, children) => {
  let aCh = WIP.kids || [],
    bCh = (WIP.kids = asArray(children)),
    aHead = 0,
    bHead = 0,
    aTail = aCh.length - 1,
    bTail = bCh.length - 1;
  while (aHead <= aTail && bHead <= bTail) {
    if (!same(aCh[aHead], bCh[bHead])) break;
    clone(aCh[aHead++], bCh[bHead++], LANE.UPDATE);
  }
  while (aHead <= aTail && bHead <= bTail) {
    if (!same(aCh[aTail], bCh[bTail])) break;
    clone(aCh[aTail--], bCh[bTail--], LANE.UPDATE);
  }
  // LCS
  const { diff, keymap } = lcs(bCh, aCh, bHead, bTail, aHead, aTail);
  let len = diff.length;
  for (let i = 0, aIndex = aHead, bIndex = bHead, mIndex; i < len; i++) {
    const op = diff[i];
    if (op === LANE.UPDATE) {
      if (!same(aCh[aIndex], bCh[bIndex])) {
        bCh[bIndex].lane = LANE.INSERT;
        aCh[aIndex].lane = LANE.REMOVE;
        effect.e = aCh[aIndex];
        effect = aCh[aIndex];
      } else {
        clone(aCh[aIndex], bCh[bIndex], LANE.UPDATE);
      }
      aIndex++;
      bIndex++;
    } else if (op === LANE.INSERT) {
      let c = bCh[bIndex];
      mIndex = c.key != null ? keymap[c.key] : null;
      if (mIndex != null) {
        clone(aCh[mIndex], c, LANE.INSERT);
        c.after = WIP.childNodes[aIndex];
        aCh[mIndex] = undefined;
      } else {
        c.after = WIP.childNodes ? WIP.childNodes[aIndex] : null;
        c.lane = LANE.INSERT;
      }
      bIndex++;
    } else if (op === LANE.REMOVE) {
      aIndex++;
    }
  }
  for (let i = 0, aIndex = aHead; i < len; i++) {
    let op = diff[i];
    if (op === LANE.UPDATE) {
      aIndex++;
    } else if (op === LANE.REMOVE) {
      let c = aCh[aIndex];
      if (c !== undefined) {
        c.lane = LANE.REMOVE;
        effect.e = c;
        effect = c;
      }
      aIndex++;
    }
  }
  for (let i = 0, prev = null, len = bCh.length; i < len; i++) {
    const child = bCh[i];
    if (WIP.lane & LANE.SVG) {
      child.lane |= LANE.SVG;
    }
    child.parent = WIP;
    if (i > 0) {
      prev.sibling = child;
    } else {
      WIP.child = child;
    }
    prev = child;
  }
};

const clone = (a, b, lane) => {
  b.hooks = a.hooks;
  b.ref = a.ref;
  b.node = a.node;
  b.oldProps = a.props;
  b.lane = lane;
  b.kids = a.kids;
};

const same = (a, b) => {
  return a && b && a.key === b.key && a.type === b.type;
};

const side = (effects) => {
  effects.forEach((e) => e[2] && e[2]());
  effects.forEach((e) => (e[2] = e[0]()));
  effects.length = 0;
};

const lcs = (
  bArr,
  aArr,
  bHead = 0,
  bTail = bArr.length - 1,
  aHead = 0,
  aTail = aArr.length - 1
) => {
  let keymap = {},
    unkeyed = [],
    idxUnkeyed = 0,
    ch,
    item,
    k,
    idxInOld,
    key;
  let newLen = bArr.length;
  let oldLen = aArr.length;
  let minLen = Math.min(newLen, oldLen);
  let tresh = Array(minLen + 1);
  tresh[0] = -1;
  for (var i = 1; i < tresh.length; i++) {
    tresh[i] = aTail + 1;
  }
  let link = Array(minLen);
  for (i = aHead; i <= aTail; i++) {
    item = aArr[i];
    key = item.key;
    if (key != null) {
      keymap[key] = i;
    } else {
      unkeyed.push(i);
    }
  }
  for (i = bHead; i <= bTail; i++) {
    ch = bArr[i];
    idxInOld = ch.key == null ? unkeyed[idxUnkeyed++] : keymap[ch.key];
    if (idxInOld != null) {
      k = bs(tresh, idxInOld);
      if (k >= 0) {
        tresh[k] = idxInOld;
        link[k] = { newi: i, oldi: idxInOld, prev: link[k - 1] };
      }
    }
  }
  k = tresh.length - 1;
  while (tresh[k] > aTail) k--;
  let ptr = link[k];
  let diff = Array(oldLen + newLen - k);
  let curNewi = bTail,
    curOldi = aTail;
  let d = diff.length - 1;
  while (ptr) {
    const { newi, oldi } = ptr;
    while (curNewi > newi) {
      diff[d--] = LANE.INSERT;
      curNewi--;
    }
    while (curOldi > oldi) {
      diff[d--] = LANE.REMOVE;
      curOldi--;
    }
    diff[d--] = LANE.UPDATE;
    curNewi--;
    curOldi--;
    ptr = ptr.prev;
  }
  while (curNewi >= bHead) {
    diff[d--] = LANE.INSERT;
    curNewi--;
  }
  while (curOldi >= aHead) {
    diff[d--] = LANE.REMOVE;
    curOldi--;
  }
  return {
    diff,
    keymap,
  };
};

const bs = (ktr, j) => {
  let lo = 1;
  let hi = ktr.length - 1;
  while (lo <= hi) {
    let mid = (lo + hi) >>> 1;
    if (j < ktr[mid]) hi = mid - 1;
    else lo = mid + 1;
  }
  return lo;
};

const getCurrentFiber = () => currentFiber || null;

export { render, update, getCurrentFiber };