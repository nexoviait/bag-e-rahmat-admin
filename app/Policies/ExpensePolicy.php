<?php

namespace App\Policies;

class ExpensePolicy extends ProjectLedgerPolicy
{
    protected function permissionPrefix(): string
    {
        return 'expenses';
    }
}
