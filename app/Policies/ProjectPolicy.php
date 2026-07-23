<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    /**
     * Super Admin and Admin are both unrestricted over every project.
     */
    public function before(User $user, string $ability): ?bool
    {
        return $user->hasAnyRole(['Super Admin', 'Admin']) ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return true; // scoping to assigned projects happens in the controller query
    }

    public function view(User $user, Project $project): bool
    {
        return $user->assignedProjects()->where('projects.id', $project->id)->exists();
    }

    public function create(User $user): bool
    {
        return false; // only Super Admin/Admin (handled by before()) may create projects
    }

    public function update(User $user, Project $project): bool
    {
        return false;
    }

    public function delete(User $user, Project $project): bool
    {
        return false;
    }

    public function assignUsers(User $user, Project $project): bool
    {
        return false;
    }
}
