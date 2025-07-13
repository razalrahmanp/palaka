import React from "react";
import { Customer } from "@/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FiltersBar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  customers,
  setSelectedCustomer,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  categories: string[];
  customers: Customer[];
  setSelectedCustomer: (c: Customer | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Input
        placeholder="Search products..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-48"
      />
      <Select
        value={selectedCategory || "ALL"}
        onValueChange={(v) => setSelectedCategory(v === "ALL" ? "" : v)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        onValueChange={(id) => {
          const customer = customers.find((c) => c.id === id) || null;
          setSelectedCustomer(customer);
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select Customer" />
        </SelectTrigger>
        <SelectContent>
          {customers.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
