import React from 'react';
import StatsBranchesPage from './StatsBranchesPage';
import StatsCitiesPage from './StatsCitiesPage';
import StatsMastersPage from './StatsMastersPage';
import StatsAdvertisingPage from './StatsAdvertisingPage';

function StatsPage({ subPage }) {
  if (subPage === 'stats:cities') return <StatsCitiesPage />;
  if (subPage === 'stats:masters') return <StatsMastersPage />;
  if (subPage === 'stats:advertising') return <StatsAdvertisingPage />;
  return <StatsBranchesPage />;
}

export default StatsPage;