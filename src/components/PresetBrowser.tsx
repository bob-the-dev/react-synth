import { useState } from "react";
import {
  INSTRUMENT_PRESETS,
  PRESET_CATEGORIES,
  getPresetsByCategory,
  type InstrumentPreset,
} from "../presets/instrumentPresets";
import "./PresetBrowser.css";

interface PresetBrowserProps {
  onSelectPreset: (preset: InstrumentPreset) => void;
  onClose: () => void;
}

function PresetBrowser({ onSelectPreset, onClose }: PresetBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("piano");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredPresets = searchTerm
    ? INSTRUMENT_PRESETS.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : getPresetsByCategory(selectedCategory);

  return (
    <div className="preset-browser-overlay" onClick={onClose}>
      <div className="preset-browser" onClick={(e) => e.stopPropagation()}>
        <div className="preset-browser-header">
          <h2>Select Instrument Preset</h2>
          <button className="preset-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="preset-search">
          <input
            type="text"
            placeholder="Search presets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="preset-content">
          {!searchTerm && (
            <div className="preset-categories">
              {Object.entries(PRESET_CATEGORIES).map(([key, label]) => (
                <button
                  key={key}
                  className={`category-btn ${
                    selectedCategory === key ? "active" : ""
                  }`}
                  onClick={() => setSelectedCategory(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="preset-list">
            {filteredPresets.length > 0 ? (
              filteredPresets.map((preset, index) => (
                <div
                  key={index}
                  className="preset-item"
                  onClick={() => {
                    onSelectPreset(preset);
                    onClose();
                  }}
                >
                  <div className="preset-name">{preset.name}</div>
                  <div className="preset-category-tag">
                    {
                      PRESET_CATEGORIES[
                        preset.category as keyof typeof PRESET_CATEGORIES
                      ]
                    }
                  </div>
                </div>
              ))
            ) : (
              <div className="no-presets">No presets found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PresetBrowser;
