"use client";
import { subcategoryMap } from "@/types";

export default function CategoryDebug() {
  const allCategories = Object.keys(subcategoryMap);
  const vehicleCategories = allCategories.filter(cat => cat.includes('Vehicle'));
  const dailyWagesCategories = allCategories.filter(cat => cat.includes('Daily Wages'));
  
  return (
    <div className="p-4 bg-gray-100 m-4 rounded">
      <h2 className="text-lg font-bold mb-4">Category Debug Info</h2>
      <p><strong>Total Categories:</strong> {allCategories.length}</p>
      
      <div className="mt-4">
        <h3 className="font-semibold">Vehicle Categories ({vehicleCategories.length}):</h3>
        <ul className="list-disc pl-5">
          {vehicleCategories.map(cat => (
            <li key={cat}>{cat} - {subcategoryMap[cat as keyof typeof subcategoryMap]?.category}</li>
          ))}
        </ul>
      </div>
      
      <div className="mt-4">
        <h3 className="font-semibold">Daily Wages Categories ({dailyWagesCategories.length}):</h3>
        <ul className="list-disc pl-5">
          {dailyWagesCategories.map(cat => (
            <li key={cat}>{cat} - {subcategoryMap[cat as keyof typeof subcategoryMap]?.category}</li>
          ))}
        </ul>
      </div>
      
      <div className="mt-4">
        <h3 className="font-semibold">Last 10 Categories:</h3>
        <ul className="list-disc pl-5">
          {allCategories.slice(-10).map(cat => (
            <li key={cat}>{cat}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
