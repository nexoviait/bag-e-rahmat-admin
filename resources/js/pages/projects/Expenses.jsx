import React from 'react';
import LedgerCrudPage from '../../components/LedgerCrudPage';

const Expenses = () => <LedgerCrudPage title="Expenses" endpoint="expenses" permissionPrefix="expenses" />;

export default Expenses;
