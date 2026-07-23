<?php

namespace Database\Seeders;

use App\Models\Budget;
use App\Models\Expense;
use App\Models\OwnerPayment;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\Revenue;
use App\Models\Setting;
use App\Models\ShareholderInvestment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Roles
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        $pmRole = Role::firstOrCreate(['name' => 'Project Manager']);
        $accountantRole = Role::firstOrCreate(['name' => 'Accountant']);
        $viewerRole = Role::firstOrCreate(['name' => 'Viewer']);

        // 2. Permissions
        $permissions = [
            'view_budget', 'create_budget', 'edit_budget', 'delete_budget',
            'view_revenue', 'create_revenue', 'edit_revenue', 'delete_revenue',
            'view_expenses', 'create_expenses', 'edit_expenses', 'delete_expenses',
            'view_shareholders', 'create_shareholders', 'edit_shareholders', 'delete_shareholders',
            'view_owner_payments', 'create_owner_payments', 'edit_owner_payments', 'delete_owner_payments',
            'view_audit_logs', 'manage_settings',
        ];
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // Super Admin/Admin bypass every check in code (see Policy::before() implementations)
        // — no permissions assigned to them.
        $fullLedgerAccess = array_values(array_filter($permissions, fn ($p) => ! in_array($p, ['view_audit_logs', 'manage_settings'])));
        $pmRole->syncPermissions($fullLedgerAccess);
        $accountantRole->syncPermissions($fullLedgerAccess);

        $viewOnly = array_values(array_filter($permissions, fn ($p) => str_starts_with($p, 'view_') && $p !== 'view_audit_logs'));
        $viewerRole->syncPermissions($viewOnly);

        // 3. Settings
        Setting::updateOrCreate(['key' => 'company_name'], ['value' => 'Project Finance Admin']);
        Setting::updateOrCreate(['key' => 'currency_symbol'], ['value' => '$']);

        // 4. Users — one per role, for demo login
        $superAdmin = User::create([
            'name' => 'Sara Superadmin',
            'email' => 'superadmin@example.com',
            'password' => Hash::make('password123'),
        ]);
        $superAdmin->assignRole($superAdminRole);

        $admin = User::create([
            'name' => 'Adam Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('password123'),
        ]);
        $admin->assignRole($adminRole);

        $projectManager = User::create([
            'name' => 'Priya Manager',
            'email' => 'pm@example.com',
            'password' => Hash::make('password123'),
        ]);
        $projectManager->assignRole($pmRole);

        $accountant = User::create([
            'name' => 'Aaron Accountant',
            'email' => 'accountant@example.com',
            'password' => Hash::make('password123'),
        ]);
        $accountant->assignRole($accountantRole);

        $viewer = User::create([
            'name' => 'Vera Viewer',
            'email' => 'viewer@example.com',
            'password' => Hash::make('password123'),
        ]);
        $viewer->assignRole($viewerRole);

        // 5. Demo Projects (varied status)
        $projectDefs = [
            ['name' => 'Riverside Community Center', 'description' => 'New community center build in the riverside district.', 'status' => 'active', 'start_date' => '2025-09-01', 'end_date' => '2026-12-31'],
            ['name' => 'Downtown Office Renovation', 'description' => 'Full renovation of the downtown administrative office.', 'status' => 'active', 'start_date' => '2025-11-01', 'end_date' => null],
            ['name' => 'Solar Farm Expansion', 'description' => 'Phase 2 expansion of the community solar farm.', 'status' => 'on_hold', 'start_date' => '2025-06-01', 'end_date' => null],
            ['name' => 'Harbor Bridge Repair', 'description' => 'Structural repair and repainting of the harbor bridge.', 'status' => 'completed', 'start_date' => '2025-01-01', 'end_date' => '2025-12-15'],
        ];

        $projects = [];
        foreach ($projectDefs as $def) {
            $def['created_by'] = $admin->id;
            $projects[] = Project::create($def);
        }

        [$riverside, $downtown, $solarFarm, $harborBridge] = $projects;

        // 6. Project Assignments — deliberately partial, so scoping is visibly exercised
        $this->assign($riverside, $projectManager, $admin);
        $this->assign($downtown, $projectManager, $admin);
        $this->assign($downtown, $accountant, $admin);
        $this->assign($solarFarm, $accountant, $admin);
        $this->assign($harborBridge, $viewer, $admin);

        // 7. Ledger entries — ~12 months spread per project so dashboards/charts render real data
        foreach ($projects as $project) {
            $this->seedLedgerHistory($project, $admin);
        }
    }

    private function assign(Project $project, User $user, User $assignedBy): void
    {
        ProjectAssignment::firstOrCreate(
            ['project_id' => $project->id, 'user_id' => $user->id],
            ['assigned_by' => $assignedBy->id]
        );
    }

    private function seedLedgerHistory(Project $project, User $creator): void
    {
        $months = 12;
        $baseBudget = rand(8000, 15000);
        $baseRevenue = rand(6000, 12000);
        $baseExpense = rand(4000, 9000);

        for ($i = $months - 1; $i >= 0; $i--) {
            $monthDate = Carbon::now()->subMonths($i);

            Budget::create([
                'project_id' => $project->id,
                'amount' => $baseBudget + rand(-500, 500),
                'entry_date' => $monthDate->copy()->startOfMonth()->addDays(2)->toDateString(),
                'description' => 'Monthly budget allocation for '.$monthDate->format('M Y'),
                'created_by' => $creator->id,
            ]);

            Revenue::create([
                'project_id' => $project->id,
                'amount' => $baseRevenue + rand(-800, 1500),
                'entry_date' => $monthDate->copy()->startOfMonth()->addDays(10)->toDateString(),
                'description' => 'Revenue collected in '.$monthDate->format('M Y'),
                'created_by' => $creator->id,
            ]);

            Expense::create([
                'project_id' => $project->id,
                'amount' => $baseExpense + rand(-600, 1200),
                'entry_date' => $monthDate->copy()->startOfMonth()->addDays(15)->toDateString(),
                'description' => 'Operating expenses for '.$monthDate->format('M Y'),
                'created_by' => $creator->id,
            ]);
        }

        // Shareholder investments — sporadic, not monthly
        foreach ([['Northgate Capital', 20000], ['Community Trust Fund', 12000], ['Family Office Partners', 8000]] as $i => [$name, $amount]) {
            ShareholderInvestment::create([
                'project_id' => $project->id,
                'shareholder_name' => $name,
                'amount' => $amount + rand(-1000, 1000),
                'entry_date' => Carbon::now()->subMonths($months - 1)->addMonths($i * 4)->toDateString(),
                'description' => 'Capital investment into the project.',
                'created_by' => $creator->id,
            ]);
        }

        // Owner payments — quarterly
        for ($q = 0; $q < 4; $q++) {
            OwnerPayment::create([
                'project_id' => $project->id,
                'payee_name' => 'Owner',
                'amount' => rand(1500, 4000),
                'entry_date' => Carbon::now()->subMonths($months - 1)->addMonths($q * 3)->toDateString(),
                'description' => 'Quarterly owner distribution.',
                'created_by' => $creator->id,
            ]);
        }
    }
}
