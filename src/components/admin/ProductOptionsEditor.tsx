"use client";

import { useState } from "react";
import type { ProductOption, ProductOptionValue } from "@/data/products";

function emptyValue(): ProductOptionValue {
  return { label: "", value: "" };
}

function emptyOption(): ProductOption {
  return { key: "", label: "", required: false, values: [emptyValue()] };
}

// Generic option editor — key/label/required per option, an arbitrary
// number of label/value/priceDelta rows per option. Nothing here assumes
// a particular kind of option (size, finish, whatever) — the admin types
// whatever key/label/values apply to this specific product.
export default function ProductOptionsEditor({ initialOptions }: { initialOptions: ProductOption[] }) {
  const [options, setOptions] = useState<ProductOption[]>(initialOptions.length > 0 ? initialOptions : []);

  function updateOption(index: number, patch: Partial<ProductOption>) {
    setOptions((prev) => prev.map((option, i) => (i === index ? { ...option, ...patch } : option)));
  }

  function updateValue(optionIndex: number, valueIndex: number, patch: Partial<ProductOptionValue>) {
    setOptions((prev) =>
      prev.map((option, i) =>
        i === optionIndex
          ? { ...option, values: option.values.map((value, vi) => (vi === valueIndex ? { ...value, ...patch } : value)) }
          : option,
      ),
    );
  }

  function addOption() {
    setOptions((prev) => [...prev, emptyOption()]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function addValue(optionIndex: number) {
    setOptions((prev) =>
      prev.map((option, i) => (i === optionIndex ? { ...option, values: [...option.values, emptyValue()] } : option)),
    );
  }

  function removeValue(optionIndex: number, valueIndex: number) {
    setOptions((prev) =>
      prev.map((option, i) =>
        i === optionIndex ? { ...option, values: option.values.filter((_, vi) => vi !== valueIndex) } : option,
      ),
    );
  }

  return (
    <div>
      <input type="hidden" name="optionsJson" value={JSON.stringify(options)} />
      {options.map((option, optionIndex) => (
        <div className="admin-repeatable-item" key={optionIndex}>
          <div className="admin-repeatable-item-header">
            <span>Option {optionIndex + 1}</span>
            <button type="button" className="admin-remove-button" onClick={() => removeOption(optionIndex)}>
              Remove option
            </button>
          </div>
          <div className="admin-form-row admin-form-row-split">
            <label>
              Key
              <input
                type="text"
                value={option.key}
                placeholder="size"
                onChange={(e) => updateOption(optionIndex, { key: e.target.value })}
              />
            </label>
            <label>
              Label
              <input
                type="text"
                value={option.label}
                placeholder="Size"
                onChange={(e) => updateOption(optionIndex, { label: e.target.value })}
              />
            </label>
          </div>
          <label className="admin-form-checkbox-row">
            <input
              type="checkbox"
              checked={option.required}
              onChange={(e) => updateOption(optionIndex, { required: e.target.checked })}
            />
            Required — a shopper must choose a value before adding to cart
          </label>

          {option.values.map((value, valueIndex) => (
            <div className="admin-form-row admin-form-row-split admin-repeatable-subrow" key={valueIndex}>
              <label>
                Value label
                <input
                  type="text"
                  value={value.label}
                  placeholder="3 in"
                  onChange={(e) => updateValue(optionIndex, valueIndex, { label: e.target.value })}
                />
              </label>
              <label>
                Value
                <input
                  type="text"
                  value={value.value}
                  placeholder="3in"
                  onChange={(e) => updateValue(optionIndex, valueIndex, { value: e.target.value })}
                />
              </label>
              <label>
                Price delta
                <span className="admin-form-optional"> (optional — can be negative)</span>
                <input
                  type="number"
                  step="0.01"
                  value={value.priceDelta !== undefined ? value.priceDelta / 100 : ""}
                  placeholder="0.00"
                  onChange={(e) =>
                    updateValue(optionIndex, valueIndex, {
                      priceDelta: e.target.value === "" ? undefined : Math.round(Number(e.target.value) * 100),
                    })
                  }
                />
              </label>
              <button
                type="button"
                className="admin-remove-button"
                onClick={() => removeValue(optionIndex, valueIndex)}
              >
                Remove value
              </button>
            </div>
          ))}
          <button
            type="button"
            className="admin-add-button admin-repeatable-subrow"
            onClick={() => addValue(optionIndex)}
          >
            + Add value
          </button>
        </div>
      ))}
      <button type="button" className="admin-add-button" onClick={addOption}>
        + Add option
      </button>
    </div>
  );
}
