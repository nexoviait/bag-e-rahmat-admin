<?php

namespace App\Policies;

class BudgetPolicy extends ProjectLedgerPolicy
{
    protected function permissionPrefix(): string
    {
        return 'budget';
    }
}
