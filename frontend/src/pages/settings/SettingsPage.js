import React from 'react';
import DictionarySettings from './DictionarySettings';
import ProfileSettings from './ProfileSettings';

function SettingsPage({ subPage }) {
  if (subPage === 'settings:profile') {
    return <ProfileSettings />;
  }
  return <DictionarySettings />;
}

export default SettingsPage;