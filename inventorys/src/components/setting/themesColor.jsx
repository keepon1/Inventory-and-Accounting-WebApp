import React, { useState } from 'react';
import './setting.css';

const ThemeSettings = () => {
  const [theme, setTheme] = useState({
    primary: '#4361ee',
    secondary: '#3a0ca3',
    darkMode: false
  });

  const handleColorChange = (type, value) => {
    setTheme({ ...theme, [type]: value });
    document.documentElement.style.setProperty(`--${type}`, value);
  };

  return (
    <div className="dashboard-content">
      <h2 className="page-title">UI Theme & Colors</h2>
      
      <div className="theme-settings">
        <div className="theme-preview" data-dark-mode={theme.darkMode}>
          <div className="preview-header" style={{ backgroundColor: theme.primary }}>
            <div className="preview-sidebar" style={{ backgroundColor: theme.secondary }}></div>
          </div>
          <div className="preview-content">
            <div className="preview-card" style={{ 
              backgroundColor: theme.darkMode ? '#2a2a2a' : '#fff',
              color: theme.darkMode ? '#fff' : '#333'
            }}>
              Example Card Content
            </div>
          </div>
        </div>

        <div className="theme-controls">
          <div className="form-group">
            <label>Primary Color</label>
            <input
              type="color"
              value={theme.primary}
              onChange={(e) => handleColorChange('primary', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Secondary Color</label>
            <input
              type="color"
              value={theme.secondary}
              onChange={(e) => handleColorChange('secondary', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Dark Mode</label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={theme.darkMode}
                onChange={(e) => setTheme({ ...theme, darkMode: e.target.checked })}
                id="darkModeToggle"
              />
              <label htmlFor="darkModeToggle"></label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;