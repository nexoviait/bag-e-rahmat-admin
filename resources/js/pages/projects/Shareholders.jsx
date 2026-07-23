import React from 'react';
import LedgerCrudPage from '../../components/LedgerCrudPage';

const Shareholders = () => (
    <LedgerCrudPage
        title="Shareholder Investments"
        endpoint="shareholders"
        permissionPrefix="shareholders"
        extraField={{ name: 'shareholder_name', label: 'Shareholder Name', required: true }}
    />
);

export default Shareholders;
