import React, { useState } from 'react';
import './setting.css';

const DateTimeSettings = () => {
  const [settings, setSettings] = useState({
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    timezone: 'UTC-5'
  });

  const dateFormats = [
    'MM/DD/YYYY',
    'DD/MM/YYYY',
    'YYYY-MM-DD',
    'MMMM D, YYYY'
  ];

  return (
    <div className="dashboard-content">
      <h2 className="page-title">Date & Time Settings</h2>
      
      <form className="settings-form">
        <div className="form-group">
          <label>Date Format</label>
          <select
            value={settings.dateFormat}
            onChange={(e) => setSettings({...settings, dateFormat: e.target.value})}
          >
            {dateFormats.map(format => (
              <option key={format} value={format}>{format}</option>
            ))}
          </select>
          <div className="setting-preview">
            Preview: {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })}
          </div>
        </div>

        <div className="form-group">
          <label>Time Format</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="12h"
                checked={settings.timeFormat === '12h'}
                onChange={() => setSettings({...settings, timeFormat: '12h'})}
              />
              12-hour format
            </label>
            <label>
              <input
                type="radio"
                value="24h"
                checked={settings.timeFormat === '24h'}
                onChange={() => setSettings({...settings, timeFormat: '24h'})}
              />
              24-hour format
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Timezone</label>
          <select
            value={settings.timezone}
            onChange={(e) => setSettings({...settings, timezone: e.target.value})}
          >
            <option value="UTC-5">UTC-5 (Eastern Time)</option>
            <option value="UTC-8">UTC-8 (Pacific Time)</option>
            <option value="UTC+0">UTC+0 (GMT)</option>
          </select>
        </div>
      </form>
    </div>
  );
};

export default DateTimeSettings;