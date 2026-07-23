<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProjectAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Super Admin']);
        Role::firstOrCreate(['name' => 'Admin']);
        Role::firstOrCreate(['name' => 'Viewer']);

        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => bcrypt('password123'),
        ]);
        $this->admin->assignRole('Admin');

        $this->viewerA = User::create([
            'name' => 'Viewer A',
            'email' => 'viewer-a@example.com',
            'password' => bcrypt('password123'),
        ]);
        $this->viewerA->assignRole('Viewer');

        $this->projectA = Project::create(['name' => 'Project A', 'status' => 'active']);
        $this->projectB = Project::create(['name' => 'Project B', 'status' => 'active']);
    }

    public function test_admin_can_assign_and_unassign_users()
    {
        $this->actingAs($this->admin);

        $assignResponse = $this->postJson("/api/projects/{$this->projectA->id}/assign", [
            'user_ids' => [$this->viewerA->id],
        ]);
        $assignResponse->assertStatus(200);

        $this->assertDatabaseHas('project_user', [
            'project_id' => $this->projectA->id,
            'user_id' => $this->viewerA->id,
        ]);

        $unassignResponse = $this->deleteJson("/api/projects/{$this->projectA->id}/assign/{$this->viewerA->id}");
        $unassignResponse->assertStatus(200);

        $this->assertDatabaseMissing('project_user', [
            'project_id' => $this->projectA->id,
            'user_id' => $this->viewerA->id,
        ]);
    }

    public function test_scoped_role_cannot_view_an_unassigned_project()
    {
        $this->actingAs($this->admin);
        $this->postJson("/api/projects/{$this->projectA->id}/assign", ['user_ids' => [$this->viewerA->id]]);

        $this->actingAs($this->viewerA);

        $this->getJson("/api/projects/{$this->projectA->id}")->assertStatus(200);
        $this->getJson("/api/projects/{$this->projectB->id}")->assertStatus(403);
    }

    public function test_index_scopes_to_assigned_projects_for_non_admin_roles()
    {
        $this->actingAs($this->admin);
        $this->postJson("/api/projects/{$this->projectA->id}/assign", ['user_ids' => [$this->viewerA->id]]);

        $this->actingAs($this->viewerA);
        $response = $this->getJson('/api/projects');
        $response->assertStatus(200);
        $names = collect($response->json())->pluck('name');
        $this->assertTrue($names->contains('Project A'));
        $this->assertFalse($names->contains('Project B'));

        $this->actingAs($this->admin);
        $adminResponse = $this->getJson('/api/projects');
        $adminNames = collect($adminResponse->json())->pluck('name');
        $this->assertTrue($adminNames->contains('Project A'));
        $this->assertTrue($adminNames->contains('Project B'));
    }
}
