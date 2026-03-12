const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const NAME_REGEX = /^[A-ZÑ ]+$/;
const MIN_DATE = new Date('1800-01-01');

const SENTINEL_DATES = [
  '1800-01-01', '1805-01-01', '1810-01-01',
  '1825-01-01', '1830-01-01', '1835-01-01', '1845-01-01'
];

const SENTINEL_RESULTS = [0, 998, 21];

export function isSentinelDate(value) {
  return SENTINEL_DATES.includes(value);
}

export function isRealDate(value) {
  if (!isValidDateFormat(value)) return false;
  return !isSentinelDate(value) && new Date(value) > new Date('1900-01-01');
}

export function isSentinelResult(value) {
  return SENTINEL_RESULTS.includes(Number(value));
}

export function isValidDateFormat(value) {
  if (!DATE_REGEX.test(String(value))) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export function isValidDate(value) {
  if (!isValidDateFormat(value)) return false;
  const date = new Date(value);
  return date >= MIN_DATE;
}

export function isDateWithinPeriod(value, periodEnd) {
  if (!isValidDateFormat(value)) return false;
  if (isSentinelDate(value)) return true;
  return new Date(value) <= new Date(periodEnd);
}

export function isValidName(value) {
  const str = String(value);
  return NAME_REGEX.test(str) && str.length <= 30;
}

export function isInRange(value, min, max, sentinels = []) {
  const num = Number(value);
  if (sentinels.includes(num)) return true;
  return num >= min && num <= max;
}

export function calculateAgeInYears(birthDate, referenceDate) {
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);
  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function calculateAgeInDays(birthDate, referenceDate) {
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);
  return Math.floor((ref - birth) / (1000 * 60 * 60 * 24));
}

export function calculateAgeInMonths(birthDate, referenceDate) {
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);
  let months = (ref.getFullYear() - birth.getFullYear()) * 12;
  months += ref.getMonth() - birth.getMonth();
  if (ref.getDate() < birth.getDate()) months--;
  return months;
}

export function buildAgeContext(record, context) {
  const birthDate = String(record[9]);
  const refDate = context.reportingPeriodEnd;
  return {
    years: calculateAgeInYears(birthDate, refDate),
    days: calculateAgeInDays(birthDate, refDate),
    months: calculateAgeInMonths(birthDate, refDate),
    sex: String(record[10])
  };
}

export function mustBeSentinel(record, fieldIdx, sentinelValue) {
  if (typeof sentinelValue === 'string') {
    return String(record[fieldIdx]) === sentinelValue;
  }
  return numValue(record, fieldIdx) === sentinelValue;
}

export function fieldValue(record, index) {
  return record[index];
}

export function numValue(record, index) {
  return Number(record[index]);
}

export { DATE_REGEX, NAME_REGEX, SENTINEL_DATES, SENTINEL_RESULTS };
