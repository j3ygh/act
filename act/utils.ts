export const enum LANE {
  UPDATE = 1 << 1,
  INSERT = 1 << 2,
  REMOVE = 1 << 3,
  SVG = 1 << 4,
  DIRTY = 1 << 5,
  HEAD = 1 << 6,
  NOWORK = 1 << 7,
}
export const isArr = Array.isArray
export const arrayfy = arr => (!arr ? [] : isArr(arr) ? arr : [arr])
export const isFn = (x: any): x is Function => typeof x === 'function'
export const isStr = (s: any): s is number | string =>
  typeof s === 'number' || typeof s === 'string'