<?php

namespace Tests\Feature;

use App\Models\Budget;
use App\Models\Expense;
use App\Models\OwnerPayment;
use App\Models\Project;
use App\Models\Revenue;
use App\Models\ShareholderInvestment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProjectFinancialFormulasTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_and_show_compute_the_spec_formulas_exactly()
    {
        Role::firstOrCreate(['name' => 'Super Admin']);

        $admin = User::create([
            'name' => 'Super Admin User',
            'email' => 'superadmin@example.com',
            'password' => bcrypt('password123'),
        ]);
        $admin->assignRole('Super Admin');

        $project = Project::create(['name' => 'Formula Test Project', 'status' => 'active', 'created_by' => $admin->id]);

        // Budget: 1000 + 500 = 1500
        Budget::create(['project_id' => $project->id, 'amount' => 1000, 'entry_date' => '2026-01-01', 'created_by' => $admin->id]);
        Budget::create(['project_id' => $project->id, 'amount' => 500, 'entry_date' => '2026-02-01', 'created_by' => $admin->id]);

        // Revenue: 2000 + 300 = 2300
        Revenue::create(['project_id' => $project->id, 'amount' => 2000, 'entry_date' => '2026-01-05', 'created_by' => $admin->id]);
        Revenue::create(['project_id' => $project->id, 'amount' => 300, 'entry_date' => '2026-02-05', 'created_by' => $admin->id]);

        // Shareholder Investment: 5000
        ShareholderInvestment::create([
            'project_id' => $project->id, 'shareholder_name' => 'Acme Capital', 'amount' => 5000,
            'entry_date' => '2026-01-10', 'created_by' => $admin->id,
        ]);

        // Expenses: 800 + 200 = 1000
        Expense::create(['project_id' => $project->id, 'amount' => 800, 'entry_date' => '2026-01-15', 'created_by' => $admin->id]);
        Expense::create(['project_id' => $project->id, 'amount' => 200, 'entry_date' => '2026-02-15', 'created_by' => $admin->id]);

        // Owner Payments: 400
        OwnerPayment::create([
            'project_id' => $project->id, 'payee_name' => 'Owner', 'amount' => 400,
            'entry_date' => '2026-02-20', 'created_by' => $admin->id,
        ]);

        // Total Money = Budget(1500) + Revenue(2300) + Shareholder Investment(5000) = 8800
        // Deduct Money = Expenses(1000) + Owner Payments(400) = 1400
        // Remaining = 8800 - 1400 = 7400
        // Profit = Revenue(2300) - Expenses(1000) = 1300
        $expectedTotalMoney = 8800.0;
        $expectedDeductMoney = 1400.0;
        $expectedRemaining = 7400.0;
        $expectedProfit = 1300.0;

        $this->actingAs($admin);

        $showResponse = $this->getJson("/api/projects/{$project->id}");
        $showResponse->assertStatus(200);
        $formulas = $showResponse->json('formulas');
        $this->assertEquals($expectedTotalMoney, (float) $formulas['total_money']);
        $this->assertEquals($expectedDeductMoney, (float) $formulas['deduct_money']);
        $this->assertEquals($expectedRemaining, (float) $formulas['remaining']);
        $this->assertEquals($expectedProfit, (float) $formulas['profit']);

        $dashboardResponse = $this->getJson("/api/projects/{$project->id}/dashboard");
        $dashboardResponse->assertStatus(200);
        $dashboardFormulas = $dashboardResponse->json('formulas');
        $this->assertEquals($expectedTotalMoney, (float) $dashboardFormulas['total_money']);
        $this->assertEquals($expectedDeductMoney, (float) $dashboardFormulas['deduct_money']);
        $this->assertEquals($expectedRemaining, (float) $dashboardFormulas['remaining']);
        $this->assertEquals($expectedProfit, (float) $dashboardFormulas['profit']);
    }
}
