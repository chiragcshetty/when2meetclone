import { isNil } from "lodash";

const monthNames = new Array();
monthNames[0] = "Jan";
monthNames[1] = "Feb";
monthNames[2] = "Mar";
monthNames[3] = "Apr";
monthNames[4] = "May";
monthNames[5] = "Jun";
monthNames[6] = "Jul";
monthNames[7] = "Aug";
monthNames[8] = "Sep";
monthNames[9] = "Oct";
monthNames[10] = "Nov";
monthNames[11] = "Dec";
const getMonths = function () {
  return monthNames;
};
const addDays = function (originalDate: Date, days: number): Date {
  const date = originalDate;
  date.setDate(date.getDate() + days);
  return date;
};
const addHours = function (originalHour: Date, hours: number): Date {
  const date = originalHour;
  date.setHours(date.getHours() + hours);
  return date;
};
function getDates(startDate: Date, stopDate: Date) {
  const dateArray = new Array();
  let currentDate = startDate;
  while (currentDate <= stopDate) {
    dateArray.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }
  return dateArray;
}
function getHours(startTime: Date, endTime: Date) {
  const timeArray = new Array();
  let currentTime = startTime;
  while (currentTime <= endTime) {
    timeArray.push(new Date(currentTime));
    currentTime = addHours(currentTime, 1);
  }
  return timeArray;
}
function formatAMPM(date: Date) {
  let hours = date.getHours();
  let minutes: string | number = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? "0" + minutes : minutes;
  const strTime = hours + ":" + minutes + " " + ampm;
  return strTime;
}
const dateParser = function (dateString: string) {
  // Parse dates with format "09:00"
  const a = new Date();
  const [hour, minute] = dateString.split(":");
  a.setHours(+hour);
  a.setMinutes(+minute);
  return a;
};
const timeLabelGenerator = function (start_time: string, end_time: string) {
  const firstTime = dateParser(start_time);
  const lastTime = dateParser(end_time);
  const hours = getHours(firstTime, lastTime);
  return hours.map(formatAMPM);
};
/**
 * Build the row time labels from the absolute timestamps stored on the event,
 * formatted in the viewer's local timezone. `firstKey` is the earliest
 * availability timestamp (in seconds) and `count` is the number of hourly slots
 * per day. This makes the displayed times shift to the viewer's own timezone.
 */
const localTimeLabels = function (firstKey: number, count: number): string[] {
  const labels = [];
  for (let i = 0; i < count; i++) {
    labels.push(formatAMPM(new Date((firstKey + i * 3600) * 1000)));
  }
  return labels;
};
/**
 * Returns the offset (in minutes) of an IANA timezone from UTC for a given date.
 * e.g. "Asia/Singapore" -> 480, "America/New_York" (EDT) -> -240.
 */
const getTimezoneOffsetMinutes = function (
  timeZone: string,
  date: Date
): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  const parts: { [key: string]: number } = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") {
      parts[part.type] = Number(part.value);
    }
  }
  const asUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour % 24,
    parts.minute,
    parts.second
  );
  return Math.round((asUTC - date.getTime()) / 60000);
};
/**
 * A small curated list of common IANA timezones for the event creation form,
 * always including the viewer's detected local timezone.
 */
const getTimezoneOptions = function (): string[] {
  const common = [
    "Pacific/Honolulu",
    "America/Anchorage",
    "America/Los_Angeles",
    "America/Denver",
    "America/Chicago",
    "America/New_York",
    "America/Sao_Paulo",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Moscow",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Singapore",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Australia/Sydney",
    "Pacific/Auckland",
    "UTC",
  ];
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (local && !common.includes(local)) {
    common.unshift(local);
  }
  return common;
};
/**
 * Takes in the array of the first day and produces the labels for the time and date.
 * @param {array} title - The first array of the list of days
 */
const getLabelTop = function (start: string, end: string): string {
  const first = new Date(start);
  const last = new Date(end);
  return (
    first.getDate() +
    " " +
    monthNames[first.getMonth() + 1] +
    " - " +
    last.getDate() +
    " " +
    monthNames[last.getMonth() + 1]
  );
};
/**
 * Takes in all the available timings and split into n parts
 * @param {object} object object - The first array of the list of days
 * @param {parts} number parts - How many different arrays it is split into
 */
function splitToChunks(obj: any, parts: number) {
  const array = Object.keys(obj);
  const result = [];
  for (let i = parts; i > 0; i--) {
    result.push(array.splice(0, Math.ceil(array.length / i)));
  }
  return result;
}
const getDate = function (unixObject: number): number {
  const a = new Date(unixObject * 1000);
  return a.getDate();
};
const getDay = function (unixObject: number) {
  if (isNil(unixObject)) {
    return "";
  }
  const a = new Date(unixObject * 1000);
  return Intl.DateTimeFormat("en-US", { weekday: "long" }).format(a);
};

export {
  timeLabelGenerator,
  localTimeLabels,
  getTimezoneOffsetMinutes,
  getTimezoneOptions,
  getLabelTop,
  splitToChunks,
  getDate,
  getDay,
  getMonths,
};
