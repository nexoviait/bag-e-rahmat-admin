import React from 'react';
import LedgerCrudPage from '../../components/LedgerCrudPage';

const OwnerPayments = () => (
    <LedgerCrudPage
        title="Owner Payments"
        endpoint="owner-payments"
        permissionPrefix="owner_payments"
        extraField={{ name: 'payee_name', label: 'Payee Name', required: false }}
    />
);

export default OwnerPayments;
