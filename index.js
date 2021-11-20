// This script preprocesses the MFRED data set to group by time of day (or some other criteria) and apartment group.
//
// Started with By Curran Kelleher 2/24/2014

import fs from "fs";
import * as d3 from "d3";

const inputFile = "./MFRED_Aggregates_15min_2019Q1-Q4.csv";
const inputAGFile = "./ag_data.csv";
const outputFile = "./processed_MFRED_Aggregates_";
const resolution = 60;

const agFileData = fs.readFileSync(inputAGFile, "utf8");
const agData = d3.csvParse(agFileData, (d) => {
  const entry = {
    apt_group_no: +d.apt_group.substring(d.apt_group.length - 2),
    time_averaged_real_power_sigma: +d.time_averaged_real_power_sigma,
    time_averaged_real_power_W: +d.time_averaged_real_power_W,
    number_of_bedrooms: +d.number_of_bedrooms,
    number_of_bedrooms_sigma: +d.number_of_bedrooms_sigma,
    number_of_all_rooms: +d.number_of_all_rooms,
    number_of_all_rooms_sigma: +d.number_of_all_rooms_sigma,
    apt_area__meter_sq: +d.apt_area__meter_sq,
    apt_area__meter_sq_sigma: +d.apt_area__meter_sq_sigma,
    AG_description: `Rooms: ${d.number_of_all_rooms}, Area: ${d.apt_area__meter_sq}`,
  };
  return entry;
});
const agDataMap = new Map(agData.map((e) => [e.apt_group_no, e]));

function timeOfDay(date) {
  const result = new Date(date);
  result.setFullYear(1970);
  result.setMonth(0);
  result.setDate(1);
  if (resolution === 60) {
    result.setMinutes(0);
  }
  return result;
}

const fileData = fs.readFileSync(inputFile, "utf8");
const data = d3.csvParse(fileData);
const transposedData = [];
data.forEach((d) => {
  const DateTimeUTC = new Date(d.DateTimeUTC + "Z");
  const AGs01To26_kW = +d.AGs01To26_kW;
  const AGs01To26_kVAR = +d.AGs01To26_kVAR;
  const AGs01To26_kWh = +d.AGs01To26_kWh;
  for (let i = 1; i <= 26; i++) {
    let AGPart = i.toString();
    AGPart = "AG" + AGPart.padStart(2, "0");
    const noAllRooms = agDataMap.get(i).number_of_all_rooms;
    const area = agDataMap.get(i).apt_area__meter_sq;
    let entry = {
      AGNo: i,
      AG: AGPart,
      DateTimeUTC: DateTimeUTC,
      AGs01To26_kW: AGs01To26_kW,
      AGs01To26_kVAR: AGs01To26_kVAR,
      AGs01To26_kWh: AGs01To26_kWh,
      kVAR: +d[AGPart + "_kVAR"],
      kW: +d[AGPart + "_kW"],
      kWh: +d[AGPart + "_kWh"],
      timeOfDay: timeOfDay(DateTimeUTC),
      NoOfBedRooms: agDataMap.get(i).number_of_bedrooms,
      NoOfAllRooms: noAllRooms,
      AreaSqFt: area,
      AGDescription: `Rooms: ${noAllRooms}, Area: ${area}`,
    };
    transposedData.push(entry);
  }
});

const groupedData = d3.group(
  transposedData,
  (d) => d.AGNo,
  (d) => d.timeOfDay
);

const summaryData = [];
groupedData.forEach((AGValues, AGKey) => {
  AGValues.forEach((TODValues, TODKey) => {
    let e = {};
    e.resolution = resolution;
    e.AGNo = AGKey;
    e.timeOfDay = TODKey;
    e.kWAvg = d3.mean(TODValues, (d) => d.kW);
    e.kWMedian = d3.median(TODValues, (d) => d.kW);
    e.kWMax = d3.max(TODValues, (d) => d.kW);
    e.kWMin = d3.min(TODValues, (d) => d.kW);
    summaryData.push(e);
  });
});

const csv = d3.csvFormat(summaryData);

fs.writeFile(outputFile + resolution + ".csv", csv, function (err) {
  if (err) {
    console.log(err);
  } else {
    console.log("Wrote '" + outputFile + "'!");
  }
});
