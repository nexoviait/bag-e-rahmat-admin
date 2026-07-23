<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\Revenue;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $accountantRole = Role::firstOrCreate(['name' => 'Accountant']);
        $accountantRole->givePermissionTo(
            Permission::firstOrCreate(['name' => 'edit_revenue', 'guard_name' => 'web'])
        );

        $this->accountant = User::create([
            'name' => 'Accountant User',
            'email' => 'accountant@example.com',
            'password' => bcrypt('password123'),
        ]);
        $this->accountant->assignRole('Accountant');

        $this->project = Project::create(['name' => 'Test Project', 'status' => 'active']);
        ProjectAssignment::create(['project_id' => $this->project->id, 'user_id' => $this->accountant->id]);
    }

    public function test_updating_a_revenue_record_writes_an_audit_log_entry()
    {
        $this->actingAs($this->accountant);

        $revenue = Revenue::create([
            'project_id' => $this->project->id,
            'amount' => 100.00,
            'entry_date' => now()->toDateString(),
            'created_by' => $this->accountant->id,
        ]);

        $response = $this->putJson("/api/projects/{$this->project->id}/revenue/{$revenue->id}", [
            'amount' => 150.00,
            'entry_date' => now()->toDateString(),
            'description' => 'Adjusted amount',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->accountant->id,
            'model' => 'Revenue',
            'model_id' => $revenue->id,
            'action' => 'update',
        ]);

        $log = AuditLog::where('model', 'Revenue')->where('model_id', $revenue->id)->where('action', 'update')->firstOrFail();

        $this->assertNotNull($log->before_values);
        $this->assertNotNull($log->after_values);
        $this->assertEquals(100.00, $log->before_values['amount']);
        $this->assertEquals(150.00, $log->after_values['amount']);
    }
}
