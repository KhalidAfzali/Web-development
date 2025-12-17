function toMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function overlaps(aStart, aEnd, bStart, bEnd) {
  const as = toMin(aStart), ae = toMin(aEnd);
  const bs = toMin(bStart), be = toMin(bEnd);
  return as < be && bs < ae;
}
module.exports = { toMin, overlaps };
