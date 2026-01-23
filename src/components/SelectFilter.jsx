import React from 'react';

const SelectFilter = ({ options, onChange }) => {
  return (
    <select
      className="bg-transparent text-white text-sm rounded px-2 py-1"
      onChange={onChange}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default SelectFilter;
