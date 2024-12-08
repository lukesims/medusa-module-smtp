export function getCombos<O>(
  obj: object,
  idx = 0,
  cur: Partial<O> = {},
  res: Partial<O>[] = [],
) {
  const keys = Object.keys(obj);
  const key = keys[idx];
  const values = Array.isArray(obj[key])
    ? obj[key]
    : getCombos(obj[key]).map((o) => (Object.keys(o).length ? o : undefined));

  for (const value of values) {
    cur[key] = value;
    if (idx + 1 < keys.length) {
      getCombos(obj, idx + 1, cur, res);
    } else {
      res.push(JSON.parse(JSON.stringify(cur)));
    }
  }

  return res;
}
