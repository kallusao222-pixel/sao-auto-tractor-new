import { useState } from "react";
import { BookmarkPlus, Trash2 } from "lucide-react";
import {
  readReportPresets,
  removeReportPreset,
  writeReportPreset,
} from "../../utils/reporting";
import "./SavedReportPresets.css";

export default function SavedReportPresets({ scope, filters, onApply }) {
  const [presets, setPresets] = useState(() => readReportPresets(scope));
  const [selectedId, setSelectedId] = useState("");

  const savePreset = () => {
    const name = window.prompt("Name this report preset:")?.trim();
    if (!name) return;
    const preset = {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      scope,
      name,
      filters,
      createdAt: new Date().toISOString(),
    };
    if (!writeReportPreset(preset)) {
      window.alert("Could not save this preset. Browser storage may be full or unavailable.");
      return;
    }
    setPresets(readReportPresets(scope));
  };

  const applyPreset = (id) => {
    setSelectedId(id);
    const preset = presets.find((item) => item.id === id);
    if (preset) onApply(preset.filters);
  };

  const deletePreset = () => {
    const preset = presets.find((item) => item.id === selectedId);
    if (!preset || !window.confirm(`Delete saved preset “${preset.name}”?`)) return;
    if (!removeReportPreset(preset.id)) {
      window.alert("Could not delete this preset. Browser storage may be unavailable.");
      return;
    }
    setPresets(readReportPresets(scope));
    setSelectedId("");
  };

  return (
    <div className="saved-report-presets" aria-label="Saved report presets">
      <select value={selectedId} onChange={(event) => applyPreset(event.target.value)} aria-label="Load saved report preset">
        <option value="">Saved views ({presets.length})</option>
        {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
      </select>
      <button type="button" onClick={savePreset} title="Save current report filters">
        <BookmarkPlus size={15} /> Save view
      </button>
      {selectedId && (
        <button type="button" className="saved-report-delete" onClick={deletePreset} title="Delete selected saved view" aria-label="Delete selected saved view">
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
