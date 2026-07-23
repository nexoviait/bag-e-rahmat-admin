<?php

namespace App\Policies;

class ShareholderInvestmentPolicy extends ProjectLedgerPolicy
{
    protected function permissionPrefix(): string
    {
        return 'shareholders';
    }
}
