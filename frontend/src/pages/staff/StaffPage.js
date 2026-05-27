import React from 'react';
import StaffActivePage from './StaffActivePage';
import StaffArchivePage from './StaffArchivePage';
import WorkSchedulePage from './WorkSchedulePage';

function StaffPage({ subPage }) {
  if (subPage === 'staff:archive') return <StaffArchivePage />;
  if (subPage === 'staff:schedule') return <WorkSchedulePage />;
  return <StaffActivePage />;
}

export default StaffPage;