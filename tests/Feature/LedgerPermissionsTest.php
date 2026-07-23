<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LedgerPermissionsTest extends TestCase
{
    use RefreshDatabase;

    private const LEDGER_ENDPOINTS = ['budget', 'revenue', 'expenses', 'shareholders', 'owner-payments'];

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'view_budget', 'create_budget', 'edit_budget', 'delete_budget',
            'view_revenue', 'create_revenue', 'edit_revenue', 'delete_revenue',
            'view_expenses', 'create_expenses', 'edit_expenses', 'delete_expenses',
            'view_shareholders', 'create_shareholders', 'edit_shareholders', 'delete_shareholders',
            'view_owner_payments', 'create_owner_payments', 'edit_owner_payments', 'delete_owner_payments',
        ];
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $pmRole = Role::firstOrCreate(['name' => 'Project Manager']);
        $accountantRole = Role::firstOrCreate(['name' => 'Accountant']);
        $viewerRole = Role::firstOrCreate(['name' => 'Viewer']);
        Role::firstOrCreate(['name' => 'Admin']);

        $pmRole->syncPermissions($permissions);
        $accountantRole->syncPermissions($permissions);
        $viewerRole->syncPermissions(array_values(array_filter($permissions, fn ($p) => str_starts_with($p, 'view_'))));

        $this->admin = User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => bcrypt('password123')]);
        $this->admin->assignRole('Admin');

        $this->projectManager = User::create(['name' => 'PM', 'email' => 'pm@example.com', 'password' => bcrypt('password123')]);
        $this->projectManager->assignRole('Project Manager');

        $this->accountant = User::create(['name' => 'Accountant', 'email' => 'accountant@example.com', 'password' => bcrypt('password123')]);
        $this->accountant->assignRole('Accountant');

        $this->viewer = User::create(['name' => 'Viewer', 'email' => 'viewer@example.com', 'password' => bcrypt('password123')]);
        $this->viewer->assignRole('Viewer');

        $this->project = Project::create(['name' => 'Ledger Test Project', 'status' => 'active']);
        foreach ([$this->projectManager, $this->accountant, $this->viewer] as $user) {
            ProjectAssignment::create(['project_id' => $this->project->id, 'user_id' => $user->id]);
        }
    }

    private function payloadFor(string $endpoint): array
    {
        $base = ['amount' => 100, 'entry_date' => now()->toDateString()];

        return match ($endpoint) {
            'shareholders' => array_merge($base, ['shareholder_name' => 'Test Shareholder']),
            default => $base,
        };
    }

    public function test_viewer_gets_403_creating_entries_on_all_five_ledgers()
    {
        $this->actingAs($this->viewer);

        foreach (self::LEDGER_ENDPOINTS as $endpoint) {
            $response = $this->postJson("/api/projects/{$this->project->id}/{$endpoint}", $this->payloadFor($endpoint));
            $response->assertStatus(403);
        }
    }

    public function test_project_manager_and_accountant_get_200_creating_entries_on_all_five_ledgers()
    {
        foreach ([$this->projectManager, $this->accountant] as $user) {
            $this->actingAs($user);

            foreach (self::LEDGER_ENDPOINTS as $endpoint) {
                $response = $this->postJson("/api/projects/{$this->project->id}/{$endpoint}", $this->payloadFor($endpoint));
                $response->assertStatus(201);
            }
        }
    }

    public function test_scoped_role_gets_403_on_a_project_they_are_not_assigned_to()
    {
        $otherProject = Project::create(['name' => 'Other Project', 'status' => 'active']);

        $this->actingAs($this->projectManager);

        $response = $this->postJson("/api/projects/{$otherProject->id}/budget", $this->payloadFor('budget'));
        $response->assertStatus(403);
    }
}
