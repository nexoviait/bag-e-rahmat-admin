<?php

namespace App\Policies;

class RevenuePolicy extends ProjectLedgerPolicy
{
    protected function permissionPrefix(): string
    {
        return 'revenue';
    }
}
