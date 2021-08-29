export function delTmpKeys(credentials, keys) {
  keys.forEach((key) => Reflect.deleteProperty(credentials, key))
}

export function someUndefinedOrEmptyString(...args) {
  return args.some((k) => k === undefined || k === '')
}
