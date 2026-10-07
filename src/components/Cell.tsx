import { useState, useEffect, useRef } from "react";

interface CellProps {
  value: string;
  isSelected: boolean;
  isEditing: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onChange: (newValue: string) => void;
  onCommit: () => void;
}

export default function Cell({
  value,
  isSelected,
  isEditing,
  onClick,
  onDoubleClick,
  onChange,
  onCommit,
}: CellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input the moment editing starts
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit();
        }}
        onBlur={onCommit}
        className="w-24 h-8 border-2 border-blue-500 px-2 text-sm outline-none"
      />
    );
  }

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`
        w-24 h-8 border border-gray-300 flex items-center px-2
        text-sm cursor-pointer select-none
        ${isSelected ? "border-blue-500 border-2 bg-blue-50" : "bg-white"}
      `}
    >
      {value}
    </div>
  );
}