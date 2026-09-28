"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

export default function SingleFilter({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  const labelId = useId();
  const valueId = useId();
  return <div className="filter-field"><span id={labelId}>{label}</span><DropdownMenu><DropdownMenuTrigger className="filter-trigger" aria-labelledby={`${labelId} ${valueId}`}><span id={valueId}>{options.find((option) => option.value === value)?.label ?? value}</span><ChevronDown aria-hidden="true" /></DropdownMenuTrigger><DropdownMenuContent align="start" className="filter-menu"><DropdownMenuRadioGroup value={value} onValueChange={onChange}>{options.map((option) => <DropdownMenuRadioItem key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu></div>;
}
