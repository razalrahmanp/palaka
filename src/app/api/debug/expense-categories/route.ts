import { NextResponse } from "next/server";
import { subcategoryMap } from "@/types";

export async function GET() {
  const allCategories = Object.keys(subcategoryMap);
  const vehicleCategories = allCategories.filter(cat => cat.includes("Vehicle"));
  const dailyWageCategories = allCategories.filter(cat => cat.includes("Daily Wages"));
  
  return NextResponse.json({
    success: true,
    totalCategories: allCategories.length,
    vehicleCategories: vehicleCategories.length,
    dailyWageCategories: dailyWageCategories.length,
    sampleCategories: {
      "Vehicle Fuel - Truck 001": subcategoryMap["Vehicle Fuel - Truck 001"] || "Missing",
      "Daily Wages - Construction": subcategoryMap["Daily Wages - Construction"] || "Missing",
      "Contract Labor": subcategoryMap["Contract Labor"] || "Missing"
    },
    allVehicleCategories: vehicleCategories.map(cat => ({
      name: cat,
      details: subcategoryMap[cat as keyof typeof subcategoryMap]
    })),
    allDailyWageCategories: dailyWageCategories.map(cat => ({
      name: cat,
      details: subcategoryMap[cat as keyof typeof subcategoryMap]
    }))
  });
}
