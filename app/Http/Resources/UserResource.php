<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'roles' => $this->roles->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
            ]),
            'permissions' => $this->getAllPermissions()->pluck('name'),
            'assigned_projects' => $this->relationLoaded('assignedProjects')
                ? $this->assignedProjects->map(fn ($p) => ['id' => $p->id, 'name' => $p->name])
                : null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
