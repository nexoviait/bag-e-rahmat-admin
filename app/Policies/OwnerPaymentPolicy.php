<?php

namespace App\Policies;

class OwnerPaymentPolicy extends ProjectLedgerPolicy
{
    protected function permissionPrefix(): string
    {
        return 'owner_payments';
    }
}
