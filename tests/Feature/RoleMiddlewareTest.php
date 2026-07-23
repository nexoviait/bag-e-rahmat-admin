<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Super Admin']);
        Role::firstOrCreate(['name' => 'Admin']);
        $viewerRole = Role::firstOrCreate(['name' => 'Viewer']);
        $viewerRole->givePermissionTo(
            Permission::firstOrCreate(['name' => 'view_audit_logs', 'guard_name' => 'web'])
        );

        $this->viewer = User::create([
            'name' => 'Viewer User',
            'email' => 'viewer@example.com',
            'password' => bcrypt('password123'),
        ]);
        $this->viewer->assignRole('Viewer');

        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => bcrypt('password123'),
        ]);
        $this->admin->assignRole('Admin');
    }

    public function test_viewer_gets_403_creating_a_project()
    {
        $this->actingAs($this->viewer);

        $response = $this->postJson('/api/projects', [
            'name' => 'Unauthorized Project',
        ]);

        $response->assertStatus(403);
    }

    public function test_viewer_gets_403_on_cross_project_reports_overview()
    {
        $this->actingAs($this->viewer);

        $response = $this->getJson('/api/reports/overview');

        $response->assertStatus(403);
    }

    public function test_admin_can_access_cross_project_reports_overview()
    {
        $this->actingAs($this->admin);

        $response = $this->getJson('/api/reports/overview');

        $response->assertStatus(200);
    }

    public function test_viewer_with_permission_can_view_audit_logs()
    {
        $this->actingAs($this->viewer);

        $response = $this->getJson('/api/audit-logs');

        $response->assertStatus(200);
    }
}
