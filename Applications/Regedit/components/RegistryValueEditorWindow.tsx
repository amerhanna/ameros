"use client";

import { useState } from "react";
import { registry, RegistryValue } from "@/lib/registry";
import { Button } from "@/components/ui/button";
import { useWindowActions } from "@/hooks/useWindowActions";
import { toast } from "sonner";

interface RegistryValueEditorWindowProps {
  mode: "newKey" | "newValue" | "editValue";
  selectedKey: string;
  fullPath?: string;
  valueName?: string;
  currentValue?: RegistryValue;
  currentType?: "string" | "number" | "boolean" | "object";
}

const RegistryValueEditorWindow = ({
  mode,
  selectedKey,
  fullPath,
  valueName,
  currentValue,
  currentType,
}: RegistryValueEditorWindowProps) => {
  const { close } = useWindowActions();
  const [keyName, setKeyName] = useState("");
  const [valueNameState, setValueNameState] = useState(valueName ?? "");
  const [valueType, setValueType] = useState<"string" | "number" | "boolean" | "object">(currentType ?? "string");
  const [valueText, setValueText] = useState(() => {
    if (mode === "editValue" && currentValue !== undefined) {
      if (currentType === "object" && typeof currentValue === "object") {
        try {
          return JSON.stringify(currentValue, null, 2);
        } catch {
          return String(currentValue);
        }
      }
      return currentValue === null ? "" : String(currentValue);
    }
    return "";
  });

  const title =
    mode === "newKey" ? "New Registry Key" : mode === "newValue" ? "New Registry Value" : `Edit Value: ${valueName ?? "(Default)"}`;

  const parseValue = (raw: string, type: "string" | "number" | "boolean" | "object", allowEmptyString = false) => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      if (type === "string") return allowEmptyString ? "" : null;
      if (type === "number") return null;
      if (type === "boolean") return null;
      return null;
    }

    if (type === "number") return Number(raw);
    if (type === "boolean") return raw.toLowerCase() === "true";
    if (type === "object") {
      try {
        return JSON.parse(raw);
      } catch {
        toast.error("Invalid JSON value.");
        return undefined;
      }
    }

    return raw;
  };

  const handleSubmit = async () => {
    if (mode === "newKey") {
      const key = keyName.trim();
      if (!key) {
        toast.error("Key name is required.");
        return;
      }
      const defaultValue = parseValue(valueText, valueType);
      if (defaultValue === undefined) return;
      const newKeyPath = `${selectedKey}/${key}`;
      await registry.createKey(newKeyPath, defaultValue === null ? undefined : defaultValue);
      toast.success("Key created.");
      close();
      return;
    }

    if (mode === "newValue") {
      const valueNameText = valueNameState.trim();
      if (!valueNameText) {
        toast.error("Value name is required.");
        return;
      }
      const value = parseValue(valueText, valueType, true);
      if (value === undefined) return;
      await registry.set(`${selectedKey}/${valueNameText}`, value);
      toast.success("Value created.");
      close();
      return;
    }

    if (mode === "editValue") {
      const savePath = valueName === "(Default)" ? selectedKey : fullPath ?? `${selectedKey}/${valueNameState}`;
      const value = parseValue(valueText, valueType, true);
      if (value === undefined) return;
      await registry.set(savePath, value);
      toast.success("Value updated.");
      close();
    }
  };

  const typeOptions = ["string", "number", "boolean", "object"] as const;

  return (
    <div className="h-full p-4 bg-[#f3f3f3] flex flex-col gap-4">
      {mode === "newKey" ? (
        <div>
          <label className="block text-sm font-medium">Key name</label>
          <input
            className="w-full rounded border border-slate-300 px-2 py-1"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            autoFocus
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium">Value name</label>
          <input
            className="w-full rounded border border-slate-300 px-2 py-1 bg-slate-100"
            value={valueNameState}
            onChange={(e) => setValueNameState(e.target.value)}
            disabled={mode === "editValue"}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium">{mode === "newKey" ? "(Default) Type" : "Type"}</label>
        <select
          className={`w-full rounded border border-slate-300 px-2 py-1 ${mode === "editValue" ? "bg-slate-100" : ""}`}
          value={valueType}
          onChange={(e) => setValueType(e.target.value as any)}
          disabled={mode === "editValue"}
        >
          {typeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <label className="block text-sm font-medium">{mode === "newKey" ? "(Default) Value" : "Value"}</label>
        <textarea
          className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm"
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          placeholder={mode === "newKey" ? "Optional default value" : "Enter registry value"}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={close}>
          Cancel
        </Button>
        <Button variant="default" size="sm" onClick={handleSubmit}>
          {mode === "editValue" ? "Save" : "Create"}
        </Button>
      </div>
    </div>
  );
};

export default RegistryValueEditorWindow;
