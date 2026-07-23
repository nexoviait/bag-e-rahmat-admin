<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

/**
 * Shared authorization logic for the five per-project financial ledgers
 * (Budget, Revenue, Expense, ShareholderInvestment, OwnerPayment). Each
 * concrete subclass just names the permission prefix it enforces.
 */
abstract class ProjectLedgerPolicy
{
    abstract protected function permissionPrefix(): string;

    public function before(User $user, string $ability): ?bool
    {
        return $user->hasAnyRole(['Super Admin', 'Admin']) ? true : null;
    }

    public function viewAny(User $user, Project $project): bool
    {
        return $user->can('view_'.$this->permissionPrefix())
            && $user->assignedProjects->contains($project->id);
    }

    public function view(User $user, $entry): bool
    {
        return $user->can('view_'.$this->permissionPrefix())
            && $user->assignedProjects->contains($entry->project_id);
    }

    public function create(User $user, Project $project): bool
    {
        return $user->can('create_'.$this->permissionPrefix())
            && $user->assignedProjects->contains($project->id);
    }

    public function update(User $user, $entry): bool
    {
        return $user->can('edit_'.$this->permissionPrefix())
            && $user->assignedProjects->contains($entry->project_id);
    }

    public function delete(User $user, $entry): bool
    {
        return $user->can('delete_'.$this->permissionPrefix())
            && $user->assignedProjects->contains($entry->project_id);
    }
}
